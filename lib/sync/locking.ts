import { db } from "@/lib/db";
import { syncStates } from "@/lib/db/schema";
import { eq, and, lt, isNull } from "drizzle-orm";

const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export interface SyncLock {
  accountId: string;
  calendarId: string | null;
  acquiredAt: Date;
}

/**
 * Acquire a sync lock for a specific account
 * For calendar-level locks: calendarId is null
 * For event-level locks: calendarId is set
 * Returns true if lock was acquired, false if already locked
 */
export async function acquireSyncLock(
  accountId: string,
  resource: "calendars" | "events",
  calendarId?: string
): Promise<boolean> {
  // For calendar sync: use null calendarId (account-level lock)
  // For event sync: use specific calendarId (calendar-level lock)
  const lockCalendarId = resource === "calendars" ? null : (calendarId || null);
  const lockKey = `${accountId}:${resource}${lockCalendarId ? `:${lockCalendarId}` : ""}`;

  try {
    // Check if there's an existing lock
    const whereClause = lockCalendarId
      ? and(
          eq(syncStates.accountId, accountId),
          eq(syncStates.calendarId, lockCalendarId)
        )
      : and(
          eq(syncStates.accountId, accountId),
          isNull(syncStates.calendarId)
        );

    const [existing] = await db
      .select()
      .from(syncStates)
      .where(whereClause);

    const now = new Date();

    // If lock exists and is not expired
    if (existing && existing.lastSyncAt) {
      const lockAge = now.getTime() - existing.lastSyncAt.getTime();
      if (lockAge < LOCK_TIMEOUT_MS) {
        console.log(
          `[SyncLock] Lock already held for ${lockKey} (age: ${Math.round(lockAge / 1000)}s)`
        );
        return false;
      } else {
        console.log(
          `[SyncLock] Expired lock found for ${lockKey}, acquiring...`
        );
      }
    }

    // Acquire or refresh the lock
    if (existing) {
      await db
        .update(syncStates)
        .set({
          lastSyncAt: now,
          syncStatus: "syncing",
          updatedAt: now,
        })
        .where(eq(syncStates.id, existing.id));
    } else {
      await db.insert(syncStates).values({
        accountId,
        calendarId: lockCalendarId,
        lastSyncAt: now,
        syncStatus: "syncing",
      });
    }

    console.log(`[SyncLock] Lock acquired for ${lockKey}`);
    return true;
  } catch (error) {
    console.error(`[SyncLock] Error acquiring lock for ${lockKey}:`, error);
    return false;
  }
}

/**
 * Release a sync lock
 */
export async function releaseSyncLock(
  accountId: string,
  resource: "calendars" | "events",
  calendarId?: string
): Promise<void> {
  const lockCalendarId = resource === "calendars" ? null : (calendarId || null);
  const lockKey = `${accountId}:${resource}${lockCalendarId ? `:${lockCalendarId}` : ""}`;

  try {
    // We don't actually delete the lock - just set status to idle
    // This allows us to keep sync tokens
    const whereClause = lockCalendarId
      ? and(
          eq(syncStates.accountId, accountId),
          eq(syncStates.calendarId, lockCalendarId)
        )
      : and(
          eq(syncStates.accountId, accountId),
          isNull(syncStates.calendarId)
        );

    await db
      .update(syncStates)
      .set({
        syncStatus: "idle",
        updatedAt: new Date(),
      })
      .where(whereClause);

    console.log(`[SyncLock] Lock released for ${lockKey}`);
  } catch (error) {
    console.error(`[SyncLock] Error releasing lock for ${lockKey}:`, error);
  }
}

/**
 * Execute a function with a sync lock
 * Automatically acquires and releases the lock
 */
export async function withSyncLock<T>(
  accountId: string,
  resource: "calendars" | "events",
  fn: () => Promise<T>,
  calendarId?: string
): Promise<T | null> {
  const lockAcquired = await acquireSyncLock(accountId, resource, calendarId);

  if (!lockAcquired) {
    const lockKey = `${accountId}:${resource}${calendarId ? `:${calendarId}` : ""}`;
    console.log(
      `[SyncLock] Could not acquire lock for ${lockKey}, skipping sync`
    );
    return null;
  }

  try {
    const result = await fn();
    return result;
  } finally {
    await releaseSyncLock(accountId, resource, calendarId);
  }
}

/**
 * Clean up expired locks
 * Should be called periodically (e.g., on server startup or via cron)
 */
export async function cleanupExpiredLocks(): Promise<number> {
  try {
    const cutoff = new Date(Date.now() - LOCK_TIMEOUT_MS);

    await db
      .update(syncStates)
      .set({
        syncStatus: "idle",
        errorMessage: "Lock timeout - cleaned up by system",
        updatedAt: new Date(),
      })
      .where(
        and(
          lt(syncStates.lastSyncAt, cutoff),
          eq(syncStates.syncStatus, "syncing")
        )
      );

    console.log(`[SyncLock] Cleaned up expired locks`);
    return 0;
  } catch (error) {
    console.error("[SyncLock] Error cleaning up expired locks:", error);
    return 0;
  }
}
