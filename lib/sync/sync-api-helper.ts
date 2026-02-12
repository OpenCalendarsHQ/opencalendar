/**
 * Shared sync API helper for provider routes.
 * Uses sync manager for consistent sync behavior across all providers.
 */

import { db } from "@/lib/db";
import { calendarAccounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { syncAccount, type SyncResult } from "./manager";

/**
 * Trigger sync for an account. Verifies user ownership, runs sync, returns standardized response.
 */
export async function triggerAccountSync(
  accountId: string,
  userId: string
): Promise<{ account: { id: string; email: string | null; provider: string } | null; result: SyncResult }> {
  const [account] = await db
    .select()
    .from(calendarAccounts)
    .where(eq(calendarAccounts.id, accountId));

  if (!account || account.userId !== userId) {
    return {
      account: null,
      result: { accountId, provider: "unknown", success: false, calendarsSync: 0, eventsSync: 0, errors: ["Account niet gevonden"] },
    };
  }

  const result = await syncAccount(accountId);
  return {
    account: { id: account.id, email: account.email, provider: account.provider },
    result,
  };
}
