import { DAVClient, DAVCalendar, DAVObject } from "tsdav";
import { db } from "@/lib/db";
import { calendarAccounts, calendars, events, eventRecurrences } from "@/lib/db/schema";
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
  const { syncCalDAVCalendarsFromClient } = await import("./caldav-utils");
  await syncCalDAVCalendarsFromClient(client, accountId);
}

/** Sync events from an iCloud calendar (uses shared CalDAV sync logic). */
export async function syncICloudEvents(accountId: string, calendarId: string) {
  const { client } = await getClientForAccount(accountId);
  const { syncCalDAVEventsFromClient } = await import("./caldav-sync");
  await syncCalDAVEventsFromClient(client, accountId, calendarId, "iCloud");
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
