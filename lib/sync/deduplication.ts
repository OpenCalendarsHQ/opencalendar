import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { and, eq, ne, or } from "drizzle-orm";
import crypto from "crypto";

/**
 * Generate a fingerprint for an event based on its core properties
 * This helps identify the same event across different calendars
 */
export function generateEventFingerprint(
  title: string,
  startTime: Date,
  endTime: Date,
  location?: string | null
): string {
  const normalized = {
    title: title.toLowerCase().trim(),
    start: startTime.toISOString(),
    end: endTime.toISOString(),
    location: location?.toLowerCase().trim() || "",
  };

  const data = `${normalized.title}|${normalized.start}|${normalized.end}|${normalized.location}`;
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Check if an event already exists in another calendar
 * Returns the existing event if found, null otherwise
 */
export async function findDuplicateEventAcrossCalendars(
  currentCalendarId: string,
  externalId: string,
  icsUid: string | null,
  title: string,
  startTime: Date,
  endTime: Date,
  location?: string | null
): Promise<any | null> {
  // Strategy 1: Check by ICS UID (most reliable for CalDAV events)
  if (icsUid) {
    const byIcsUid = await db
      .select()
      .from(events)
      .where(
        and(
          eq(events.icsUid, icsUid),
          ne(events.calendarId, currentCalendarId)
        )
      )
      .limit(1);

    if (byIcsUid.length > 0) {
      console.log(`[Dedup] Found duplicate by ICS UID: ${icsUid}`);
      return byIcsUid[0];
    }
  }

  // Strategy 2: Check by external ID from same provider
  // (e.g., Google event shared to multiple Google calendars)
  if (externalId) {
    const byExternalId = await db
      .select()
      .from(events)
      .where(
        and(
          eq(events.externalId, externalId),
          ne(events.calendarId, currentCalendarId)
        )
      )
      .limit(1);

    if (byExternalId.length > 0) {
      console.log(`[Dedup] Found duplicate by external ID: ${externalId}`);
      return byExternalId[0];
    }
  }

  // Strategy 3: Check by event fingerprint
  // (same title, start time, end time, location in different calendars)
  const fingerprint = generateEventFingerprint(title, startTime, endTime, location);

  // Check if this fingerprint exists in another calendar
  // within a 1-minute window (to account for slight time differences)
  const startWindow = new Date(startTime.getTime() - 60000); // -1 minute
  const endWindow = new Date(startTime.getTime() + 60000); // +1 minute

  const allEvents = await db
    .select()
    .from(events)
    .where(ne(events.calendarId, currentCalendarId));

  for (const event of allEvents) {
    const eventFingerprint = generateEventFingerprint(
      event.title,
      new Date(event.startTime),
      new Date(event.endTime),
      event.location
    );

    if (eventFingerprint === fingerprint) {
      const eventStart = new Date(event.startTime);
      if (eventStart >= startWindow && eventStart <= endWindow) {
        console.log(`[Dedup] Found duplicate by fingerprint: ${event.title}`);
        return event;
      }
    }
  }

  return null;
}

/**
 * Decision: What to do when a duplicate is found
 * - "skip": Don't import this event (keep only the original)
 * - "keep-both": Import both (for cases where user wants to see event in multiple calendars)
 * - "link": Import but mark as linked to original
 */
export type DuplicateStrategy = "skip" | "keep-both" | "link";

/**
 * Handle duplicate event based on strategy
 */
export async function handleDuplicateEvent(
  duplicateEvent: any,
  strategy: DuplicateStrategy = "skip"
): Promise<{ shouldImport: boolean; linkedEventId?: string }> {
  switch (strategy) {
    case "skip":
      console.log(`[Dedup] Skipping duplicate event: ${duplicateEvent.title}`);
      return { shouldImport: false };

    case "keep-both":
      console.log(`[Dedup] Keeping both versions of: ${duplicateEvent.title}`);
      return { shouldImport: true };

    case "link":
      console.log(`[Dedup] Linking to original event: ${duplicateEvent.title}`);
      return { shouldImport: true, linkedEventId: duplicateEvent.id };

    default:
      return { shouldImport: false };
  }
}

/**
 * Get deduplication strategy from user settings or use default
 * In the future, this could be a per-user setting
 */
export function getDuplicateStrategy(): DuplicateStrategy {
  // Default: skip duplicates to avoid clutter
  // Users can change this in settings if they want to see events in multiple calendars
  return "skip";
}
