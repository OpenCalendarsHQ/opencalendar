import { db } from "@/lib/db";
import { syncStates } from "@/lib/db/schema";
import { eq, and, lt } from "drizzle-orm";

const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export interface SyncLock {
  accountId: string;
  resource: string;
  acquiredAt: Date;
}

/**
 * Acquire a sync lock for a specific account and resource
 * Returns true if lock was acquired, false if already locked
 */
export async function acquireSyncLock(
  accountId: string,
  resource: "calendars" | "events"
): Promise<boolean> {
  const lockKey = `${accountId}:${resource}`;

  try {
    // Check if there's an existing lock
    const [existing] = await db
      .select()
      .from(syncStates)
      .where(
        and(
          eq(syncStates.accountId, accountId),
          eq(syncStates.resource, resource)
        )
      );

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
          syncToken: null,
          updatedAt: now,
        })
        .where(eq(syncStates.id, existing.id));
    } else {
      await db.insert(syncStates).values({
        accountId,
        resource,
        lastSyncAt: now,
        syncToken: null,
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
  resource: "calendars" | "events"
): Promise<void> {
  const lockKey = `${accountId}:${resource}`;

  try {
    // We don't actually delete the lock - just set lastSyncAt to a past time
    // This allows us to keep sync tokens while releasing the lock
    const pastTime = new Date(Date.now() - LOCK_TIMEOUT_MS - 1000);

    await db
      .update(syncStates)
      .set({
        lastSyncAt: pastTime,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(syncStates.accountId, accountId),
          eq(syncStates.resource, resource)
        )
      );

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
  fn: () => Promise<T>
): Promise<T | null> {
  const lockAcquired = await acquireSyncLock(accountId, resource);

  if (!lockAcquired) {
    console.log(
      `[SyncLock] Could not acquire lock for ${accountId}:${resource}, skipping sync`
    );
    return null;
  }

  try {
    const result = await fn();
    return result;
  } finally {
    await releaseSyncLock(accountId, resource);
  }
}

/**
 * Clean up expired locks
 * Should be called periodically (e.g., on server startup or via cron)
 */
export async function cleanupExpiredLocks(): Promise<number> {
  try {
    const cutoff = new Date(Date.now() - LOCK_TIMEOUT_MS);

    const result = await db
      .update(syncStates)
      .set({
        lastSyncAt: new Date(0), // Set to epoch to mark as released
        updatedAt: new Date(),
      })
      .where(lt(syncStates.lastSyncAt, cutoff));

    console.log(`[SyncLock] Cleaned up expired locks`);
    return 0; // Drizzle doesn't return affected rows count easily
  } catch (error) {
    console.error("[SyncLock] Error cleaning up expired locks:", error);
    return 0;
  }
}
