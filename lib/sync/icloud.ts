import { DAVClient, DAVCalendar, DAVObject } from "tsdav";
import { db } from "@/lib/db";
import {
  calendarAccounts,
  calendars,
  events,
  syncStates,
  eventRecurrences,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { parseFirstEvent, generateSingleEventICS } from "./ical-parser";

const ICLOUD_CALDAV_URL = "https://caldav.icloud.com";

/**
 * Create a CalDAV client for an iCloud account.
 */
export async function createICloudClient(
  email: string,
  appPassword: string
): Promise<DAVClient> {
  const client = new DAVClient({
    serverUrl: ICLOUD_CALDAV_URL,
    credentials: {
      username: email,
      password: appPassword,
    },
    authMethod: "Basic",
    defaultAccountType: "caldav",
  });

  await client.login();
  return client;
}

/**
 * Test iCloud connection with provided credentials.
 */
export async function testICloudConnection(
  email: string,
  appPassword: string
): Promise<boolean> {
  try {
    const client = await createICloudClient(email, appPassword);
    const cals = await client.fetchCalendars();
    return cals.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get an authenticated CalDAV client for an account from DB.
 */
async function getClientForAccount(
  accountId: string
): Promise<{ client: DAVClient; account: typeof calendarAccounts.$inferSelect }> {
  const [account] = await db
    .select()
    .from(calendarAccounts)
    .where(eq(calendarAccounts.id, accountId));

  if (!account || !account.accessToken) {
    throw new Error("Account not found or missing credentials");
  }

  // For iCloud, accessToken stores the app-specific password
  const client = await createICloudClient(
    account.email,
    account.accessToken
  );

  return { client, account };
}

/**
 * Fetch all calendars from an iCloud account and sync to DB.
 */
export async function syncICloudCalendars(accountId: string) {
  const { client } = await getClientForAccount(accountId);
  const davCalendars: DAVCalendar[] = await client.fetchCalendars();

  for (const davCal of davCalendars) {
    if (!davCal.url) continue;

    // Extract a color from the CalDAV properties
    const color: string = extractCalendarColor(davCal) || "#3b82f6";
    const name: string = String(davCal.displayName || "Naamloze kalender");
    const calUrl: string = String(davCal.url);

    // Upsert calendar
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
      // Never overwrite color — user may have customized it
      await db
        .update(calendars)
        .set({
          name,
          updatedAt: new Date(),
        })
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

/**
 * Sync events from an iCloud calendar using CalDAV.
 */
export async function syncICloudEvents(
  accountId: string,
  calendarId: string
) {
  const { client } = await getClientForAccount(accountId);

  // Get the calendar's external ID (CalDAV URL)
  const [cal] = await db
    .select()
    .from(calendars)
    .where(eq(calendars.id, calendarId));

  if (!cal?.externalId) {
    throw new Error("Calendar external ID not found");
  }

  // Get sync state
  const [state] = await db
    .select()
    .from(syncStates)
    .where(
      and(
        eq(syncStates.accountId, accountId),
        eq(syncStates.calendarId, calendarId)
      )
    );

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

    // Fetch calendar objects (events) from CalDAV
    const calendarObjects: DAVObject[] = await client.fetchCalendarObjects({
      calendar: {
        url: cal.externalId,
      } as DAVCalendar,
    });

    // Track which external IDs we've seen (for deletion detection)
    const seenExternalIds = new Set<string>();

    for (const obj of calendarObjects) {
      if (!obj.data || !obj.url) continue;

      const icsData = obj.data;
      const parsed = parseFirstEvent(icsData);

      if (!parsed) continue;

      const externalId = obj.url;
      seenExternalIds.add(externalId);

      // Upsert event
      const [existing] = await db
        .select()
        .from(events)
        .where(
          and(
            eq(events.calendarId, calendarId),
            eq(events.externalId, externalId)
          )
        );

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
        // Only update if etag changed
        if (existing.etag !== obj.etag) {
          await db
            .update(events)
            .set(eventData)
            .where(eq(events.id, existing.id));
        }
      } else {
        const [newEvent] = await db.insert(events).values({
          calendarId,
          externalId,
          ...eventData,
        }).returning();
        eventId = newEvent.id;
      }

      // Handle recurrence rule
      if (parsed.rrule) {
        // Parse UNTIL date (can be date-only or datetime)
        let recurUntil: Date | null = null;
        if (parsed.rrule.includes("UNTIL=")) {
          try {
            const untilStr = parsed.rrule.split("UNTIL=")[1].split(";")[0];
            // Handle both date-only (20230714) and datetime (20230714T235959Z) formats
            if (untilStr.length === 8) {
              // Date only: 20230714
              recurUntil = new Date(
                parseInt(untilStr.substring(0, 4)),
                parseInt(untilStr.substring(4, 6)) - 1,
                parseInt(untilStr.substring(6, 8))
              );
            } else {
              // Datetime: 20230714T235959Z
              recurUntil = new Date(untilStr.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?/, "$1-$2-$3T$4:$5:$6Z"));
            }
          } catch (e) {
            console.error(`Failed to parse UNTIL date: ${e}`);
          }
        }

        // Skip events that ended more than 1 year ago
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        if (recurUntil && recurUntil < oneYearAgo) {
          // Skip this event - it's too old
          continue;
        }

        // Check if recurrence rule exists
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
          await db.insert(eventRecurrences).values({
            eventId,
            ...recurrenceData,
          });
        }
      } else {
        // Remove recurrence rule if event is no longer recurring
        await db
          .delete(eventRecurrences)
          .where(eq(eventRecurrences.eventId, eventId));
      }
    }

    // Delete events that no longer exist on the server
    const existingEvents = await db
      .select()
      .from(events)
      .where(eq(events.calendarId, calendarId));

    for (const existingEvent of existingEvents) {
      if (
        existingEvent.externalId &&
        !seenExternalIds.has(existingEvent.externalId)
      ) {
        await db.delete(events).where(eq(events.id, existingEvent.id));
      }
    }

    // Update sync state
    await updateSyncStatus("success");

    // Update account last sync time
    await db
      .update(calendarAccounts)
      .set({ lastSyncAt: new Date(), updatedAt: new Date() })
      .where(eq(calendarAccounts.id, accountId));
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Onbekende fout";
    await updateSyncStatus("error", errorMessage);
    throw error;
  }
}

/**
 * Create a new event on iCloud via CalDAV.
 */
export async function createICloudEvent(
  accountId: string,
  calendarId: string,
  eventData: {
    title: string;
    startTime: Date;
    endTime: Date;
    isAllDay: boolean;
    location?: string;
    description?: string;
  }
) {
  const { client } = await getClientForAccount(accountId);

  const [cal] = await db
    .select()
    .from(calendars)
    .where(eq(calendars.id, calendarId));

  if (!cal?.externalId) {
    throw new Error("Calendar external ID not found");
  }

  const uid = crypto.randomUUID();

  const icsData = generateSingleEventICS({
    uid,
    title: eventData.title,
    startTime: eventData.startTime,
    endTime: eventData.endTime,
    isAllDay: eventData.isAllDay,
    location: eventData.location,
    description: eventData.description,
    alarms: [{ trigger: "-PT15M" }], // Default 15 min reminder
  });

  await client.createCalendarObject({
    calendar: { url: cal.externalId } as DAVCalendar,
    filename: `${uid}.ics`,
    iCalString: icsData,
  });

  return uid;
}

/**
 * Update an existing event on iCloud via CalDAV.
 */
export async function updateICloudEvent(
  accountId: string,
  calendarId: string,
  eventId: string,
  eventData: {
    title?: string;
    startTime?: Date;
    endTime?: Date;
    isAllDay?: boolean;
    location?: string;
    description?: string;
  }
) {
  const { client } = await getClientForAccount(accountId);

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId));

  if (!event) {
    throw new Error("Event not found in database");
  }

  // If no externalId or icsData, event was never synced or can't be updated
  if (!event.externalId || !event.icsData) {
    throw new Error("Event not synced to iCloud or missing ICS data");
  }

  // Get recurrence data if this is a recurring event
  let rrule: string | null = null;
  let exDates: string[] | null = null;

  if (event.isRecurring) {
    const [recurrence] = await db
      .select()
      .from(eventRecurrences)
      .where(eq(eventRecurrences.eventId, eventId));

    if (recurrence) {
      rrule = recurrence.rrule;
      exDates = recurrence.exDates as string[] | null;
    }
  }

  // Rebuild ICS with updated fields
  const uid = event.icsUid || crypto.randomUUID();
  const startTime = eventData.startTime || event.startTime;
  const endTime = eventData.endTime || event.endTime;
  const isAllDay = eventData.isAllDay ?? event.isAllDay;

  const icsData = generateSingleEventICS({
    uid,
    title: eventData.title || event.title,
    startTime,
    endTime,
    isAllDay,
    location: eventData.location || event.location,
    description: eventData.description || event.description,
    rrule,
    exDates: exDates || undefined,
    sequence: 1, // Increment sequence on update
    alarms: [{ trigger: "-PT15M" }],
  });

  await client.updateCalendarObject({
    calendarObject: {
      url: event.externalId,
      data: icsData,
      etag: event.etag || undefined,
    },
  });
}

/**
 * Delete an event from iCloud via CalDAV.
 */
export async function deleteICloudEvent(
  accountId: string,
  eventId: string
) {
  const { client } = await getClientForAccount(accountId);

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId));

  if (!event) {
    throw new Error("Event not found in database");
  }

  // If no externalId, event was never synced to iCloud, nothing to delete
  if (!event.externalId) {
    return;
  }

  await client.deleteCalendarObject({
    calendarObject: {
      url: event.externalId,
      etag: event.etag || undefined,
    },
  });
}

/**
 * Extract color from CalDAV calendar properties.
 */
function extractCalendarColor(davCal: DAVCalendar): string | null {
  // Try to get color from the calendar object
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
