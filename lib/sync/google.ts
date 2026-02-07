import { google, calendar_v3 } from "googleapis";
import { db } from "@/lib/db";
import {
  calendarAccounts,
  calendars,
  events,
  syncStates,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI!;

/**
 * Create a Google OAuth2 client.
 */
export function createOAuth2Client() {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
}

/**
 * Generate the Google OAuth authorization URL.
 */
export function getAuthorizationUrl(state: string): string {
  const oauth2Client = createOAuth2Client();

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ],
    state,
    prompt: "consent",
  });
}

/**
 * Exchange authorization code for tokens.
 */
export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Create an authenticated Google Calendar client for an account.
 */
export async function getCalendarClient(
  accountId: string
): Promise<calendar_v3.Calendar> {
  const [account] = await db
    .select()
    .from(calendarAccounts)
    .where(eq(calendarAccounts.id, accountId));

  if (!account) {
    throw new Error("Account not found");
  }

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: account.accessToken,
    refresh_token: account.refreshToken,
    expiry_date: account.tokenExpiresAt?.getTime(),
  });

  // Handle token refresh
  oauth2Client.on("tokens", async (tokens) => {
    await db
      .update(calendarAccounts)
      .set({
        accessToken: tokens.access_token || account.accessToken,
        refreshToken: tokens.refresh_token || account.refreshToken,
        tokenExpiresAt: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : account.tokenExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(calendarAccounts.id, accountId));
  });

  return google.calendar({ version: "v3", auth: oauth2Client });
}

/**
 * Fetch all calendars from a Google account and sync to DB.
 */
export async function syncGoogleCalendars(accountId: string) {
  const calendarClient = await getCalendarClient(accountId);

  const { data } = await calendarClient.calendarList.list();
  const calendarList = data.items || [];

  for (const gcal of calendarList) {
    if (!gcal.id) continue;

    // Upsert calendar
    const [existing] = await db
      .select()
      .from(calendars)
      .where(
        and(
          eq(calendars.accountId, accountId),
          eq(calendars.externalId, gcal.id)
        )
      );

    if (existing) {
      await db
        .update(calendars)
        .set({
          name: gcal.summary || existing.name,
          color: gcal.backgroundColor || existing.color,
          isReadOnly: gcal.accessRole === "reader",
          isPrimary: gcal.primary || false,
          updatedAt: new Date(),
        })
        .where(eq(calendars.id, existing.id));
    } else {
      await db.insert(calendars).values({
        accountId,
        externalId: gcal.id,
        name: gcal.summary || "Naamloze kalender",
        color: gcal.backgroundColor || "#3b82f6",
        isReadOnly: gcal.accessRole === "reader",
        isPrimary: gcal.primary || false,
        timezone: gcal.timeZone || "Europe/Amsterdam",
      });
    }
  }
}

/**
 * Sync events from a Google Calendar using incremental sync.
 */
export async function syncGoogleEvents(
  accountId: string,
  calendarId: string
) {
  const calendarClient = await getCalendarClient(accountId);

  // Get the calendar's external ID
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

  // Update sync status
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

    const params: calendar_v3.Params$Resource$Events$List = {
      calendarId: cal.externalId,
      singleEvents: true,
      maxResults: 2500,
    };

    // Use sync token for incremental sync if available
    if (state?.syncToken) {
      params.syncToken = state.syncToken;
    } else {
      // Full sync: get events from 6 months ago to 1 year ahead
      const now = new Date();
      params.timeMin = new Date(
        now.getFullYear(),
        now.getMonth() - 6,
        1
      ).toISOString();
      params.timeMax = new Date(
        now.getFullYear() + 1,
        now.getMonth(),
        1
      ).toISOString();
    }

    let nextPageToken: string | undefined;
    let nextSyncToken: string | undefined;

    do {
      if (nextPageToken) {
        params.pageToken = nextPageToken;
      }

      const { data } = await calendarClient.events.list(params);
      const eventItems = data.items || [];

      for (const gEvent of eventItems) {
        if (!gEvent.id) continue;

        const startTime = gEvent.start?.dateTime
          ? new Date(gEvent.start.dateTime)
          : gEvent.start?.date
          ? new Date(gEvent.start.date)
          : null;
        const endTime = gEvent.end?.dateTime
          ? new Date(gEvent.end.dateTime)
          : gEvent.end?.date
          ? new Date(gEvent.end.date)
          : null;

        if (!startTime || !endTime) continue;

        const isAllDay = !gEvent.start?.dateTime;

        // Check if event was deleted
        if (gEvent.status === "cancelled") {
          await db
            .delete(events)
            .where(
              and(
                eq(events.calendarId, calendarId),
                eq(events.externalId, gEvent.id)
              )
            );
          continue;
        }

        // Upsert event
        const [existing] = await db
          .select()
          .from(events)
          .where(
            and(
              eq(events.calendarId, calendarId),
              eq(events.externalId, gEvent.id)
            )
          );

        const eventData = {
          title: gEvent.summary || "(Geen titel)",
          description: gEvent.description || null,
          startTime,
          endTime,
          isAllDay,
          location: gEvent.location || null,
          status: (gEvent.status === "confirmed"
            ? "confirmed"
            : gEvent.status === "tentative"
            ? "tentative"
            : "confirmed") as "confirmed" | "tentative" | "cancelled",
          timezone: gEvent.start?.timeZone || "Europe/Amsterdam",
          isRecurring: !!gEvent.recurringEventId,
          url: gEvent.hangoutLink || null,
          updatedAt: new Date(),
        };

        if (existing) {
          await db
            .update(events)
            .set(eventData)
            .where(eq(events.id, existing.id));
        } else {
          await db.insert(events).values({
            calendarId,
            externalId: gEvent.id,
            ...eventData,
          });
        }
      }

      nextPageToken = data.nextPageToken || undefined;
      nextSyncToken = data.nextSyncToken || undefined;
    } while (nextPageToken);

    // Save the new sync token
    if (nextSyncToken) {
      if (state) {
        await db
          .update(syncStates)
          .set({
            syncToken: nextSyncToken,
            syncStatus: "success",
            lastSyncAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(syncStates.id, state.id));
      } else {
        await db.insert(syncStates).values({
          accountId,
          calendarId,
          syncToken: nextSyncToken,
          syncStatus: "success",
          lastSyncAt: new Date(),
        });
      }
    } else {
      await updateSyncStatus("success");
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Onbekende fout";
    await updateSyncStatus("error", errorMessage);

    // If sync token is invalid, clear it and do full sync next time
    if (
      error instanceof Error &&
      error.message.includes("Sync token is no longer valid")
    ) {
      if (state) {
        await db
          .update(syncStates)
          .set({ syncToken: null, updatedAt: new Date() })
          .where(eq(syncStates.id, state.id));
      }
    }

    throw error;
  }
}

/**
 * Create a new event on Google Calendar.
 */
export async function createGoogleEvent(
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
  const calendarClient = await getCalendarClient(accountId);

  const [cal] = await db
    .select()
    .from(calendars)
    .where(eq(calendars.id, calendarId));

  if (!cal?.externalId) {
    throw new Error("Calendar external ID not found");
  }

  const event: calendar_v3.Schema$Event = {
    summary: eventData.title,
    description: eventData.description || undefined,
    location: eventData.location || undefined,
    start: eventData.isAllDay
      ? { date: eventData.startTime.toISOString().split("T")[0] }
      : { dateTime: eventData.startTime.toISOString(), timeZone: "Europe/Amsterdam" },
    end: eventData.isAllDay
      ? { date: eventData.endTime.toISOString().split("T")[0] }
      : { dateTime: eventData.endTime.toISOString(), timeZone: "Europe/Amsterdam" },
  };

  const { data } = await calendarClient.events.insert({
    calendarId: cal.externalId,
    requestBody: event,
  });

  return data.id;
}

/**
 * Update an existing event on Google Calendar.
 */
export async function updateGoogleEvent(
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
  const calendarClient = await getCalendarClient(accountId);

  const [cal] = await db
    .select()
    .from(calendars)
    .where(eq(calendars.id, calendarId));

  if (!cal?.externalId) {
    throw new Error("Calendar external ID not found");
  }

  // Get the event from our DB to find the external ID
  const [localEvent] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId));

  if (!localEvent?.externalId) {
    throw new Error("Event external ID not found");
  }

  // First fetch current event from Google to preserve fields we're not updating
  const { data: currentEvent } = await calendarClient.events.get({
    calendarId: cal.externalId,
    eventId: localEvent.externalId,
  });

  const isAllDay = eventData.isAllDay ?? localEvent.isAllDay;
  const startTime = eventData.startTime || localEvent.startTime;
  const endTime = eventData.endTime || localEvent.endTime;

  const updatedEvent: calendar_v3.Schema$Event = {
    ...currentEvent,
    summary: eventData.title || currentEvent.summary,
    description: eventData.description !== undefined ? eventData.description : currentEvent.description,
    location: eventData.location !== undefined ? eventData.location : currentEvent.location,
    start: isAllDay
      ? { date: startTime.toISOString().split("T")[0] }
      : { dateTime: startTime.toISOString(), timeZone: "Europe/Amsterdam" },
    end: isAllDay
      ? { date: endTime.toISOString().split("T")[0] }
      : { dateTime: endTime.toISOString(), timeZone: "Europe/Amsterdam" },
  };

  await calendarClient.events.update({
    calendarId: cal.externalId,
    eventId: localEvent.externalId,
    requestBody: updatedEvent,
  });
}

/**
 * Delete an event from Google Calendar.
 */
export async function deleteGoogleEvent(
  accountId: string,
  calendarId: string,
  eventId: string
) {
  const calendarClient = await getCalendarClient(accountId);

  const [cal] = await db
    .select()
    .from(calendars)
    .where(eq(calendars.id, calendarId));

  if (!cal?.externalId) {
    throw new Error("Calendar external ID not found");
  }

  const [localEvent] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId));

  if (!localEvent?.externalId) {
    throw new Error("Event external ID not found");
  }

  await calendarClient.events.delete({
    calendarId: cal.externalId,
    eventId: localEvent.externalId,
  });
}
