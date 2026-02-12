/**
 * Shared CalDAV utilities used by iCloud and generic CalDAV sync.
 * Reduces duplication between icloud.ts and caldav.ts.
 */

import type { DAVClient, DAVCalendar } from "tsdav";
import { db } from "@/lib/db";
import { calendars } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/** Extract calendar color from CalDAV calendar object (calendar-color or calendarColor) */
export function extractCalendarColor(davCal: DAVCalendar): string | null {
  const calObj = davCal as Record<string, unknown>;
  const props = calObj["props"] as Record<string, unknown> | undefined;
  if (props) {
    const color = props["calendar-color"] || props["calendarColor"];
    if (typeof color === "string" && color.startsWith("#")) {
      return color.substring(0, 7); // Return #RRGGBB
    }
  }
  return null;
}

/** Sync calendars from CalDAV client to DB. Used by both iCloud and generic CalDAV. */
export async function syncCalDAVCalendarsFromClient(
  client: DAVClient,
  accountId: string
): Promise<void> {
  const davCalendars: DAVCalendar[] = await client.fetchCalendars();

  for (const davCal of davCalendars) {
    if (!davCal.url) continue;

    const color = extractCalendarColor(davCal) || "#3b82f6";
    const name = String(davCal.displayName || "Naamloze kalender");
    const calUrl = String(davCal.url);

    const [existing] = await db
      .select()
      .from(calendars)
      .where(
        and(
          eq(calendars.accountId, accountId),
          eq(calendars.externalId, calUrl)
        )
      );

    if (existing) {
      await db
        .update(calendars)
        .set({ name, updatedAt: new Date() })
        .where(eq(calendars.id, existing.id));
    } else {
      await db.insert(calendars).values({
        accountId,
        externalId: calUrl,
        name,
        color,
        timezone: "Europe/Amsterdam",
      });
    }
  }
}
