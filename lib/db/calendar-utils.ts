/**
 * Shared utilities for calendar operations and ownership verification
 */

import { db } from "./index";
import { calendars, calendarAccounts, events } from "./schema";
import { eq, and } from "drizzle-orm";

/**
 * Verifies that a calendar belongs to the specified user
 * @param calendarId - The calendar ID to check
 * @param userId - The user ID to verify ownership
 * @returns The calendar if owned by user, null otherwise
 */
export async function verifyCalendarOwnership(calendarId: string, userId: string) {
  const [cal] = await db
    .select({ id: calendars.id })
    .from(calendars)
    .innerJoin(calendarAccounts, eq(calendars.accountId, calendarAccounts.id))
    .where(
      and(
        eq(calendars.id, calendarId),
        eq(calendarAccounts.userId, userId)
      )
    );

  return cal || null;
}

/**
 * Verifies that an event belongs to the specified user (through calendar ownership)
 * @param eventId - The event ID to check
 * @param userId - The user ID to verify ownership
 * @returns The event with calendar info if owned by user, null otherwise
 */
export async function verifyEventOwnership(eventId: string, userId: string) {
  const [evt] = await db
    .select({
      id: events.id,
      calendarId: events.calendarId,
    })
    .from(events)
    .innerJoin(calendars, eq(events.calendarId, calendars.id))
    .innerJoin(calendarAccounts, eq(calendars.accountId, calendarAccounts.id))
    .where(
      and(
        eq(events.id, eventId),
        eq(calendarAccounts.userId, userId)
      )
    );

  return evt || null;
}

/**
 * Gets calendar provider information (Google/iCloud/etc)
 * @param calendarId - The calendar ID
 * @param userId - The user ID for security check
 * @returns Calendar with provider info or null
 */
export async function getCalendarProviderInfo(calendarId: string, userId: string) {
  const [cal] = await db
    .select({
      id: calendars.id,
      provider: calendarAccounts.provider,
      accountId: calendars.accountId,
      externalId: calendars.externalId,
      accessToken: calendarAccounts.accessToken,
      refreshToken: calendarAccounts.refreshToken,
    })
    .from(calendars)
    .innerJoin(calendarAccounts, eq(calendars.accountId, calendarAccounts.id))
    .where(
      and(
        eq(calendars.id, calendarId),
        eq(calendarAccounts.userId, userId)
      )
    );

  return cal || null;
}

/**
 * Checks if a calendar is read-only
 * @param calendarId - The calendar ID to check
 * @returns true if read-only, false otherwise
 */
export async function isCalendarReadOnly(calendarId: string): Promise<boolean> {
  const [cal] = await db
    .select({ isReadOnly: calendars.isReadOnly })
    .from(calendars)
    .where(eq(calendars.id, calendarId));

  return cal?.isReadOnly ?? false;
}
