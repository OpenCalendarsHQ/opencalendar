import { db } from "@/lib/db";
import { calendarAccounts, calendars } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { syncGoogleCalendars, syncGoogleEvents } from "./google";
import {
  syncICloudCalendars,
  syncICloudEvents,
} from "./icloud";
import {
  syncCalDAVCalendars,
  syncCalDAVEvents,
} from "./caldav";
import { withSyncLock } from "./locking";

export interface SyncResult {
  accountId: string;
  provider: string;
  success: boolean;
  calendarsSync: number;
  eventsSync: number;
  errors: string[];
}

/**
 * Sync all calendars and events for a specific account.
 */
export async function syncAccount(accountId: string): Promise<SyncResult> {
  const [account] = await db
    .select()
    .from(calendarAccounts)
    .where(eq(calendarAccounts.id, accountId));

  if (!account) {
    return {
      accountId,
      provider: "unknown",
      success: false,
      calendarsSync: 0,
      eventsSync: 0,
      errors: ["Account niet gevonden"],
    };
  }

  const result: SyncResult = {
    accountId,
    provider: account.provider,
    success: true,
    calendarsSync: 0,
    eventsSync: 0,
    errors: [],
  };

  try {
    // Skip local calendars - they don't sync
    if (account.provider === "local") {
      return result;
    }

    // Acquire lock for calendar sync
    const calendarSyncResult = await withSyncLock(
      accountId,
      "calendars",
      async () => {
        // Sync calendars
        if (account.provider === "google") {
          await syncGoogleCalendars(accountId);
        } else if (account.provider === "icloud") {
          await syncICloudCalendars(accountId);
        } else if (account.provider === "caldav") {
          await syncCalDAVCalendars(accountId);
        }
        return true;
      }
    );

    // If calendar sync was skipped due to lock, return early
    if (calendarSyncResult === null) {
      result.success = false;
      result.errors.push("Sync al bezig voor dit account");
      return result;
    }

    // Get all calendars for the account
    const cals = await db
      .select()
      .from(calendars)
      .where(eq(calendars.accountId, accountId));

    result.calendarsSync = cals.length;

    // Sync events for each calendar with locking
    for (const cal of cals) {
      try {
        const eventSyncResult = await withSyncLock(
          accountId,
          "events",
          async () => {
            if (account.provider === "google") {
              await syncGoogleEvents(accountId, cal.id);
            } else if (account.provider === "icloud") {
              await syncICloudEvents(accountId, cal.id);
            } else if (account.provider === "caldav") {
              await syncCalDAVEvents(accountId, cal.id);
            }
            return true;
          },
          cal.id // Pass calendarId for per-calendar locking
        );

        if (eventSyncResult !== null) {
          result.eventsSync++;
        } else {
          result.errors.push(`${cal.name}: Sync al bezig`);
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Onbekende fout bij event sync";
        result.errors.push(`${cal.name}: ${message}`);
      }
    }

    // Update last sync timestamp
    await db
      .update(calendarAccounts)
      .set({ lastSyncAt: new Date(), updatedAt: new Date() })
      .where(eq(calendarAccounts.id, accountId));

    result.success = result.errors.length === 0;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Onbekende fout";
    result.errors.push(message);
    result.success = false;
  }

  return result;
}

/**
 * Sync all accounts for a user.
 */
export async function syncAllAccounts(
  userId: string
): Promise<SyncResult[]> {
  const accounts = await db
    .select()
    .from(calendarAccounts)
    .where(eq(calendarAccounts.userId, userId));

  const results = await Promise.allSettled(
    accounts
      .filter((a) => a.isActive)
      .map((account) => syncAccount(account.id))
  );

  return results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return {
      accountId: accounts[i].id,
      provider: accounts[i].provider,
      success: false,
      calendarsSync: 0,
      eventsSync: 0,
      errors: [r.reason?.message || "Onbekende fout"],
    };
  });
}
