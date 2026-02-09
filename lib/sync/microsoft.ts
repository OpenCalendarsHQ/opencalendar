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

const MICROSOFT_GRAPH_API_URL = "https://graph.microsoft.com/v1.0";
const MICROSOFT_AUTH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0";

interface MicrosoftCalendar {
  id: string;
  name: string;
  color?: string;
  isDefaultCalendar?: boolean;
  canEdit?: boolean;
  owner?: {
    name?: string;
    address?: string;
  };
}

interface MicrosoftEvent {
  id: string;
  iCalUId: string;
  subject: string;
  bodyPreview?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: {
    displayName?: string;
  };
  isAllDay: boolean;
  isCancelled?: boolean;
  recurrence?: {
    pattern: {
      type: string;
      interval: number;
      daysOfWeek?: string[];
      dayOfMonth?: number;
      month?: number;
      index?: string;
    };
    range: {
      type: string;
      startDate: string;
      endDate?: string;
      numberOfOccurrences?: number;
    };
  };
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<TokenResponse> {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Microsoft client credentials not configured");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
    scope: "offline_access Calendars.ReadWrite User.Read",
  });

  const response = await fetch(`${MICROSOFT_AUTH_URL}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code for token: ${error}`);
  }

  return response.json();
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<TokenResponse> {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Microsoft client credentials not configured");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
    scope: "offline_access Calendars.ReadWrite User.Read",
  });

  const response = await fetch(`${MICROSOFT_AUTH_URL}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  return response.json();
}

/**
 * Get an authenticated Graph API client for an account from DB.
 */
async function getAccessTokenForAccount(accountId: string): Promise<{
  accessToken: string;
  account: typeof calendarAccounts.$inferSelect;
}> {
  const [account] = await db
    .select()
    .from(calendarAccounts)
    .where(eq(calendarAccounts.id, accountId));

  if (!account || !account.accessToken) {
    throw new Error("Account not found or missing credentials");
  }

  // Check if token is expired
  let accessToken = account.accessToken;
  const now = new Date();

  if (account.tokenExpiresAt && account.tokenExpiresAt <= now) {
    // Token expired, refresh it
    if (!account.refreshToken) {
      throw new Error("Refresh token not available");
    }

    const tokenResponse = await refreshAccessToken(account.refreshToken);
    accessToken = tokenResponse.access_token;

    // Update tokens in database
    const expiresAt = new Date(now.getTime() + tokenResponse.expires_in * 1000);
    await db
      .update(calendarAccounts)
      .set({
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token || account.refreshToken,
        tokenExpiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(calendarAccounts.id, accountId));
  }

  return { accessToken, account };
}

/**
 * Make authenticated request to Microsoft Graph API
 */
async function graphRequest<T>(
  accessToken: string,
  endpoint: string,
  method: string = "GET",
  body?: unknown
): Promise<T> {
  const response = await fetch(`${MICROSOFT_GRAPH_API_URL}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Microsoft Graph API error: ${error}`);
  }

  return response.json();
}

/**
 * Get user profile information
 */
export async function getMicrosoftUserProfile(
  accessToken: string
): Promise<{ mail?: string; userPrincipalName?: string; displayName?: string }> {
  return graphRequest(accessToken, "/me");
}

/**
 * Fetch all calendars from a Microsoft account and sync to DB.
 */
export async function syncMicrosoftCalendars(accountId: string) {
  const { accessToken } = await getAccessTokenForAccount(accountId);

  const response = await graphRequest<{ value: MicrosoftCalendar[] }>(
    accessToken,
    "/me/calendars"
  );

  for (const msCalendar of response.value) {
    // Convert Microsoft color to hex (if available)
    const color = msCalendar.color
      ? convertMicrosoftColorToHex(msCalendar.color)
      : "#3b82f6";

    // Upsert calendar
    const [existing] = await db
      .select()
      .from(calendars)
      .where(
        and(
          eq(calendars.accountId, accountId),
          eq(calendars.externalId, msCalendar.id)
        )
      );

    if (existing) {
      // Never overwrite color — user may have customized it
      await db
        .update(calendars)
        .set({
          name: msCalendar.name,
          isReadOnly: !msCalendar.canEdit,
          isPrimary: !!msCalendar.isDefaultCalendar,
          updatedAt: new Date(),
        })
        .where(eq(calendars.id, existing.id));
    } else {
      await db.insert(calendars).values({
        accountId,
        externalId: msCalendar.id,
        name: msCalendar.name,
        color,
        isReadOnly: !msCalendar.canEdit,
        isPrimary: !!msCalendar.isDefaultCalendar,
        timezone: "Europe/Amsterdam",
      });
    }
  }
}

/**
 * Sync events from a Microsoft calendar.
 */
export async function syncMicrosoftEvents(
  accountId: string,
  calendarId: string
) {
  const { accessToken } = await getAccessTokenForAccount(accountId);

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

    // Fetch events from Microsoft Graph API
    // Get events from 1 year ago to 1 year in the future
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);

    // Use /events instead of /calendarView to get master recurring events with RRULE
    // CalendarView expands recurring events into instances, which we handle client-side
    const response = await graphRequest<{ value: MicrosoftEvent[] }>(
      accessToken,
      `/me/calendars/${cal.externalId}/events?$top=1000`
    );

    // Track which external IDs we've seen (for deletion detection)
    const seenExternalIds = new Set<string>();

    for (const msEvent of response.value) {
      if (msEvent.isCancelled) continue;

      const externalId = msEvent.id;
      const iCalUId = msEvent.iCalUId || null;
      seenExternalIds.add(externalId);

      // Parse dates
      const startTime = new Date(msEvent.start.dateTime);
      const endTime = new Date(msEvent.end.dateTime);

      // Upsert event - use iCalUId for deduplication if available, fallback to externalId
      // iCalUId is more stable across systems than Microsoft's event ID
      const [existing] = await db
        .select()
        .from(events)
        .where(
          and(
            eq(events.calendarId, calendarId),
            iCalUId
              ? eq(events.icsUid, iCalUId)
              : eq(events.externalId, externalId)
          )
        );

      // Log if we found a match by iCalUId but externalId changed
      if (existing && iCalUId && existing.externalId !== externalId) {
        console.log(`[Microsoft Sync] Event ID changed: ${msEvent.subject} (iCalUId: ${iCalUId})`);
        console.log(`  Old ID: ${existing.externalId}`);
        console.log(`  New ID: ${externalId}`);
      }

      const eventData = {
        title: msEvent.subject || "(Geen titel)",
        description: msEvent.bodyPreview || null,
        startTime,
        endTime,
        isAllDay: msEvent.isAllDay,
        location: msEvent.location?.displayName || null,
        status: "confirmed" as const,
        timezone: msEvent.start.timeZone || "Europe/Amsterdam",
        icsUid: msEvent.iCalUId || null,
        isRecurring: !!msEvent.recurrence,
        updatedAt: new Date(),
      };

      let eventId: string;

      if (existing) {
        eventId = existing.id;
        // Update externalId in case Microsoft ID changed
        await db
          .update(events)
          .set({
            ...eventData,
            externalId,
          })
          .where(eq(events.id, existing.id));
      } else {
        const [newEvent] = await db
          .insert(events)
          .values({
            calendarId,
            externalId,
            ...eventData,
          })
          .returning();
        eventId = newEvent.id;
      }

      // Handle recurrence rule
      if (msEvent.recurrence) {
        const rrule = convertMicrosoftRecurrenceToRRule(msEvent.recurrence);

        // Check if recurrence rule exists
        const [existingRecurrence] = await db
          .select()
          .from(eventRecurrences)
          .where(eq(eventRecurrences.eventId, eventId));

        const recurrenceData = {
          rrule,
          recurUntil:
            msEvent.recurrence.range.endDate
              ? new Date(msEvent.recurrence.range.endDate)
              : null,
          recurCount:
            msEvent.recurrence.range.numberOfOccurrences || null,
          exDates: [],
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
 * Convert Microsoft color category to hex color
 */
function convertMicrosoftColorToHex(colorName: string): string {
  const colorMap: Record<string, string> = {
    lightBlue: "#3b82f6",
    lightGreen: "#22c55e",
    lightOrange: "#f97316",
    lightGray: "#6b7280",
    lightYellow: "#eab308",
    lightTeal: "#14b8a6",
    lightPink: "#ec4899",
    lightBrown: "#92400e",
    lightRed: "#ef4444",
    maxColor: "#8b5cf6",
  };

  return colorMap[colorName] || "#3b82f6";
}

/**
 * Convert Microsoft recurrence to RRULE format
 */
function convertMicrosoftRecurrenceToRRule(recurrence: MicrosoftEvent["recurrence"]): string {
  if (!recurrence) return "";

  const { pattern, range } = recurrence;
  let rrule = "FREQ=";

  // Frequency
  switch (pattern.type) {
    case "daily":
      rrule += "DAILY";
      break;
    case "weekly":
      rrule += "WEEKLY";
      break;
    case "absoluteMonthly":
    case "relativeMonthly":
      rrule += "MONTHLY";
      break;
    case "absoluteYearly":
    case "relativeYearly":
      rrule += "YEARLY";
      break;
    default:
      rrule += "DAILY";
  }

  // Interval
  if (pattern.interval && pattern.interval > 1) {
    rrule += `;INTERVAL=${pattern.interval}`;
  }

  // Days of week
  if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
    const days = pattern.daysOfWeek
      .map((day) => day.substring(0, 2).toUpperCase())
      .join(",");
    rrule += `;BYDAY=${days}`;
  }

  // Day of month
  if (pattern.dayOfMonth) {
    rrule += `;BYMONTHDAY=${pattern.dayOfMonth}`;
  }

  // Month
  if (pattern.month) {
    rrule += `;BYMONTH=${pattern.month}`;
  }

  // Range
  if (range.type === "endDate" && range.endDate) {
    const endDate = new Date(range.endDate);
    const untilStr = endDate.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    rrule += `;UNTIL=${untilStr}`;
  } else if (range.type === "numbered" && range.numberOfOccurrences) {
    rrule += `;COUNT=${range.numberOfOccurrences}`;
  }

  return rrule;
}

/**
 * Create a new event on Microsoft Calendar
 */
export async function createMicrosoftEvent(
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
  const { accessToken } = await getAccessTokenForAccount(accountId);

  const [cal] = await db
    .select()
    .from(calendars)
    .where(eq(calendars.id, calendarId));

  if (!cal?.externalId) {
    throw new Error("Calendar external ID not found");
  }

  const event = {
    subject: eventData.title,
    body: {
      contentType: "Text",
      content: eventData.description || "",
    },
    start: {
      dateTime: eventData.startTime.toISOString(),
      timeZone: "Europe/Amsterdam",
    },
    end: {
      dateTime: eventData.endTime.toISOString(),
      timeZone: "Europe/Amsterdam",
    },
    isAllDay: eventData.isAllDay,
    location: eventData.location
      ? {
          displayName: eventData.location,
        }
      : undefined,
  };

  const response = await graphRequest<MicrosoftEvent>(
    accessToken,
    `/me/calendars/${cal.externalId}/events`,
    "POST",
    event
  );

  return response.id;
}

/**
 * Update an existing event on Microsoft Calendar
 */
export async function updateMicrosoftEvent(
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
  const { accessToken } = await getAccessTokenForAccount(accountId);

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId));

  if (!event) {
    throw new Error("Event not found in database");
  }

  if (!event.externalId) {
    throw new Error("Event not synced to Microsoft or missing external ID");
  }

  const updatePayload: Record<string, unknown> = {};

  if (eventData.title !== undefined) {
    updatePayload.subject = eventData.title;
  }
  if (eventData.description !== undefined) {
    updatePayload.body = {
      contentType: "Text",
      content: eventData.description,
    };
  }
  if (eventData.startTime !== undefined) {
    updatePayload.start = {
      dateTime: eventData.startTime.toISOString(),
      timeZone: "Europe/Amsterdam",
    };
  }
  if (eventData.endTime !== undefined) {
    updatePayload.end = {
      dateTime: eventData.endTime.toISOString(),
      timeZone: "Europe/Amsterdam",
    };
  }
  if (eventData.isAllDay !== undefined) {
    updatePayload.isAllDay = eventData.isAllDay;
  }
  if (eventData.location !== undefined) {
    updatePayload.location = {
      displayName: eventData.location,
    };
  }

  await graphRequest(
    accessToken,
    `/me/events/${event.externalId}`,
    "PATCH",
    updatePayload
  );
}

/**
 * Delete an event from Microsoft Calendar
 */
export async function deleteMicrosoftEvent(
  accountId: string,
  eventId: string
) {
  const { accessToken } = await getAccessTokenForAccount(accountId);

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId));

  if (!event) {
    throw new Error("Event not found in database");
  }

  if (!event.externalId) {
    return;
  }

  await graphRequest(
    accessToken,
    `/me/events/${event.externalId}`,
    "DELETE"
  );
}
