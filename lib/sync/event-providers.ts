/**
 * Unified event provider registry.
 * Centralizes create/update/delete logic for all calendar providers (DRY).
 */

import { db } from "@/lib/db";
import { events, calendars, calendarAccounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createICloudEvent, updateICloudEvent, deleteICloudEvent } from "./icloud";
import { createGoogleEvent, updateGoogleEvent, deleteGoogleEvent } from "./google";
import { createMicrosoftEvent, updateMicrosoftEvent, deleteMicrosoftEvent } from "./microsoft";
import { createCalDAVEvent, updateCalDAVEvent, deleteCalDAVEvent } from "./caldav";

export interface EventSyncData {
  title: string;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  location?: string;
  description?: string;
}

export interface CreateEventResult {
  icsUid?: string;
  externalId?: string;
}

export type SyncProviderName = "icloud" | "google" | "microsoft" | "caldav";
export const SYNC_PROVIDERS: readonly SyncProviderName[] = ["icloud", "google", "microsoft", "caldav"];

export interface ProviderInfo {
  accountId: string;
  provider: string;
  isReadOnly?: boolean;
}

/** Get calendar provider info for sync decisions */
export async function getCalendarProviderInfo(calendarId: string): Promise<ProviderInfo | null> {
  const [result] = await db
    .select({
      accountId: calendarAccounts.id,
      provider: calendarAccounts.provider,
      isReadOnly: calendars.isReadOnly,
    })
    .from(calendars)
    .innerJoin(calendarAccounts, eq(calendars.accountId, calendarAccounts.id))
    .where(eq(calendars.id, calendarId));
  return result || null;
}

/** Provider registry: unified interface per provider */
const PROVIDERS: Record<
  SyncProviderName,
  {
    create: (accountId: string, calendarId: string, data: EventSyncData) => Promise<string | null | undefined>;
    update: (accountId: string, calendarId: string, eventId: string, data: Partial<EventSyncData>) => Promise<void>;
    delete: (accountId: string, calendarId: string, eventId: string) => Promise<void>;
    resultKey: "icsUid" | "externalId"; // which field the create returns
  }
> = {
  icloud: {
    create: createICloudEvent,
    update: updateICloudEvent,
    delete: (accountId, _calendarId, eventId) => deleteICloudEvent(accountId, eventId),
    resultKey: "icsUid",
  },
  google: {
    create: createGoogleEvent,
    update: updateGoogleEvent,
    delete: deleteGoogleEvent,
    resultKey: "externalId",
  },
  microsoft: {
    create: createMicrosoftEvent,
    update: updateMicrosoftEvent,
    delete: (accountId, _calendarId, eventId) => deleteMicrosoftEvent(accountId, eventId),
    resultKey: "externalId",
  },
  caldav: {
    create: async (accountId, calendarId, data) => {
      const icsUid = await createCalDAVEvent(accountId, calendarId, data);
      return icsUid;
    },
    update: updateCalDAVEvent,
    delete: (accountId, _calendarId, eventId) => deleteCalDAVEvent(accountId, eventId),
    resultKey: "icsUid",
  },
};

// CalDAV needs externalId (URL) for updates - we construct it
async function createCalDAVWithExternalId(
  accountId: string,
  calendarId: string,
  eventData: EventSyncData
): Promise<CreateEventResult> {
  const icsUid = await createCalDAVEvent(accountId, calendarId, eventData);
  const [cal] = await db.select().from(calendars).where(eq(calendars.id, calendarId));
  const externalId = cal?.externalId
    ? `${cal.externalId.replace(/\/$/, "")}/${icsUid}.ics`
    : undefined;
  return { icsUid, externalId };
}

export function isSyncProvider(provider: string): provider is SyncProviderName {
  return SYNC_PROVIDERS.includes(provider as SyncProviderName);
}

/** Check if we should sync to this provider (not local, not read-only) */
export function shouldSyncToProvider(info: ProviderInfo | null): info is ProviderInfo & { provider: SyncProviderName } {
  return !!info && !info.isReadOnly && isSyncProvider(info.provider);
}

/** Build EventSyncData from event-like object */
export function buildEventSyncData(event: {
  title: string;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  location?: string | null;
  description?: string | null;
}): EventSyncData {
  return {
    title: event.title,
    startTime: event.startTime,
    endTime: event.endTime,
    isAllDay: event.isAllDay,
    location: event.location ?? undefined,
    description: event.description ?? undefined,
  };
}

/** Apply create result to event in DB (stores icsUid/externalId) */
export async function applyCreateResultToEvent(
  eventId: string,
  result: CreateEventResult
): Promise<void> {
  const updates: Record<string, string | null> = {};
  if (result.icsUid) updates.icsUid = result.icsUid;
  if (result.externalId) updates.externalId = result.externalId;
  if (Object.keys(updates).length > 0) {
    await db.update(events).set(updates).where(eq(events.id, eventId));
  }
}

/** Create event on provider and update DB with result (single operation) */
export async function createAndStoreEventOnProvider(
  provider: SyncProviderName,
  accountId: string,
  calendarId: string,
  eventId: string,
  eventData: EventSyncData
): Promise<void> {
  const result = await createEventOnProvider(provider, accountId, calendarId, eventData);
  await applyCreateResultToEvent(eventId, result);
}

/** Create event on external provider and return IDs to store in DB */
export async function createEventOnProvider(
  provider: SyncProviderName,
  accountId: string,
  calendarId: string,
  eventData: EventSyncData
): Promise<CreateEventResult> {
  if (provider === "caldav") {
    return createCalDAVWithExternalId(accountId, calendarId, eventData);
  }

  const impl = PROVIDERS[provider];
  const value = await impl.create(accountId, calendarId, eventData);
  return value ? { [impl.resultKey]: value } : {};
}

/** Update event on external provider */
export async function updateEventOnProvider(
  provider: SyncProviderName,
  accountId: string,
  calendarId: string,
  eventId: string,
  eventData: Partial<EventSyncData>
): Promise<void> {
  await PROVIDERS[provider].update(accountId, calendarId, eventId, eventData);
}

/** Delete event from external provider */
export async function deleteEventOnProvider(
  provider: SyncProviderName,
  accountId: string,
  calendarId: string,
  eventId: string
): Promise<void> {
  await PROVIDERS[provider].delete(accountId, calendarId, eventId);
}
