import type { DAVClient, DAVCalendar, DAVObject } from "tsdav";
import { db } from "@/lib/db";
import {
  calendarAccounts,
  calendars,
  events,
  syncStates,
  eventRecurrences,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { parseFirstEvent } from "./ical-parser";
import { parseRRuleUntilFromString } from "@/lib/utils/rrule";

/**
 * Sync events from a CalDAV calendar. Used by both iCloud and generic CalDAV providers.
 */
export async function syncCalDAVEventsFromClient(
  client: DAVClient,
  accountId: string,
  calendarId: string,
  logPrefix: string = "CalDAV"
) {
  const [cal] = await db.select().from(calendars).where(eq(calendars.id, calendarId));
  if (!cal?.externalId) {
    throw new Error("Calendar external ID not found");
  }

  const [state] = await db
    .select()
    .from(syncStates)
    .where(and(eq(syncStates.accountId, accountId), eq(syncStates.calendarId, calendarId)));

  const updateSyncStatus = async (
    status: "syncing" | "success" | "error",
    errorMessage?: string
  ) => {
    if (state) {
      await db
        .update(syncStates)
        .set({
          syncStatus: status,
          errorMessage,
          lastSyncAt: status === "success" ? new Date() : state.lastSyncAt,
          updatedAt: new Date(),
        })
        .where(eq(syncStates.id, state.id));
    } else {
      await db.insert(syncStates).values({
        accountId,
        calendarId,
        syncStatus: status,
        errorMessage,
      });
    }
  };

  try {
    await updateSyncStatus("syncing");

    const calendarObjects: DAVObject[] = await client.fetchCalendarObjects({
      calendar: { url: cal.externalId } as DAVCalendar,
    });

    const seenExternalIds = new Set<string>();

    for (const obj of calendarObjects) {
      if (!obj.data || !obj.url) continue;

      const icsData = obj.data;
      const parsed = parseFirstEvent(icsData);
      if (!parsed) continue;

      const externalId = obj.url;
      const icsUid = parsed.uid || null;
      seenExternalIds.add(externalId);

      const [existing] = await db
        .select()
        .from(events)
        .where(
          and(
            eq(events.calendarId, calendarId),
            icsUid ? eq(events.icsUid, icsUid) : eq(events.externalId, externalId)
          )
        );

      if (existing && icsUid && existing.externalId !== externalId) {
        console.log(`[${logPrefix} Sync] Event URL changed: ${parsed.title} (icsUid: ${icsUid})`);
        console.log(`  Old URL: ${existing.externalId}`);
        console.log(`  New URL: ${externalId}`);
      }

      const eventData = {
        title: parsed.title || "(Geen titel)",
        description: parsed.description || null,
        startTime: parsed.startTime,
        endTime: parsed.endTime,
        isAllDay: parsed.isAllDay,
        location: parsed.location || null,
        status: "confirmed" as const,
        timezone: parsed.timezone || "Europe/Amsterdam",
        etag: obj.etag || null,
        icsData,
        icsUid: parsed.uid || null,
        isRecurring: !!parsed.rrule,
        updatedAt: new Date(),
      };

      let eventId: string;

      if (existing) {
        eventId = existing.id;
        if (existing.etag !== obj.etag || existing.externalId !== externalId) {
          await db
            .update(events)
            .set({ ...eventData, externalId })
            .where(eq(events.id, existing.id));
        }
      } else {
        const [newEvent] = await db
          .insert(events)
          .values({ calendarId, externalId, ...eventData })
          .returning();
        eventId = newEvent.id;
      }

      if (parsed.rrule) {
        const recurUntil = parseRRuleUntilFromString(parsed.rrule);
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        if (recurUntil && recurUntil < oneYearAgo) continue;

        const [existingRecurrence] = await db
          .select()
          .from(eventRecurrences)
          .where(eq(eventRecurrences.eventId, eventId));

        const recurCount = parsed.rrule.includes("COUNT=")
          ? parseInt(parsed.rrule.split("COUNT=")[1].split(";")[0])
          : null;

        const recurrenceData = {
          rrule: parsed.rrule,
          recurUntil,
          recurCount,
          exDates: (parsed.exDates || []).map((d: Date) => d.toISOString()),
        };

        if (existingRecurrence) {
          await db
            .update(eventRecurrences)
            .set(recurrenceData)
            .where(eq(eventRecurrences.id, existingRecurrence.id));
        } else {
          await db.insert(eventRecurrences).values({ eventId, ...recurrenceData });
        }
      } else {
        await db.delete(eventRecurrences).where(eq(eventRecurrences.eventId, eventId));
      }
    }

    const existingEvents = await db
      .select()
      .from(events)
      .where(eq(events.calendarId, calendarId));

    for (const existingEvent of existingEvents) {
      if (existingEvent.externalId && !seenExternalIds.has(existingEvent.externalId)) {
        await db.delete(events).where(eq(events.id, existingEvent.id));
      }
    }

    await updateSyncStatus("success");
    await db
      .update(calendarAccounts)
      .set({ lastSyncAt: new Date(), updatedAt: new Date() })
      .where(eq(calendarAccounts.id, accountId));
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Onbekende fout";
    await updateSyncStatus("error", errorMessage);
    throw error;
  }
}
