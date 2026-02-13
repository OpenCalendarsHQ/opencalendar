import { NextRequest, NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import { events, calendars, calendarAccounts, eventRecurrences } from "@/lib/db/schema";
import { verifyRequest } from "@/lib/auth/verify-request";
import { ensureUserExists } from "@/lib/auth/ensure-user";
import { eq, and, gte, lte, or, isNull, desc } from "drizzle-orm";
import { z } from "zod";
import {
  getCalendarProviderInfo,
  shouldSyncToProvider,
  createAndStoreEventOnProvider,
  updateEventOnProvider,
  deleteEventOnProvider,
  buildEventSyncData,
  type EventSyncData,
} from "@/lib/sync/event-providers";
import { rateLimit, rateLimitConfigs } from "@/lib/rate-limit";
import { parseRRule } from "@/lib/utils/rrule";


const eventSchema = z.object({
  calendarId: z.string().optional(),
  title: z.string().min(1).default("(Geen titel)"),
  description: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  isAllDay: z.boolean().default(false),
  location: z.string().optional(),
  color: z.string().optional(),
  timezone: z.string().default("Europe/Amsterdam"),
  rrule: z.string().nullable().optional(),
  isRecurring: z.boolean().optional(),
});

// GET /api/events?start=...&end=...&calendarId=...
export async function GET(request: NextRequest) {
  try {
    // Accept both JWT (desktop) and session cookies (web)
    const { user } = await verifyRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    // RATE LIMITING: Prevent excessive API calls
    const rateLimitResult = rateLimit(user.id, rateLimitConfigs.reads);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Te veel verzoeken. Probeer het later opnieuw.",
          limit: rateLimitResult.limit,
          resetAt: rateLimitResult.resetAt,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(rateLimitResult.limit),
            "X-RateLimit-Remaining": String(rateLimitResult.remaining),
            "X-RateLimit-Reset": String(Math.floor(rateLimitResult.resetAt.getTime() / 1000)),
            "Retry-After": String(Math.ceil((rateLimitResult.resetAt.getTime() - Date.now()) / 1000)),
          },
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const rawStart = searchParams.get("start");
    const rawEnd = searchParams.get("end");
    const calendarId = searchParams.get("calendarId");

    // IMPORTANT: Date range is now REQUIRED to prevent loading all events at once
    // This protects against excessive network transfer usage
    if (!rawStart || !rawEnd) {
      // Default to current month ± 1 year to prevent loading all historical events
      const now = new Date();
      const defaultStart = new Date(now.getFullYear() - 1, now.getMonth(), 1);
      const defaultEnd = new Date(now.getFullYear() + 1, now.getMonth() + 1, 0);

      return NextResponse.json({
        error: "Date range required. Use ?start=YYYY-MM-DD&end=YYYY-MM-DD",
        hint: `Default range: ${defaultStart.toISOString()} to ${defaultEnd.toISOString()}`,
      }, { status: 400 });
    }

    // Parse and validate dates
    const startDate = new Date(rawStart);
    const endDate = new Date(rawEnd);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format. Use ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)" }, { status: 400 });
    }

    if (startDate > endDate) {
      return NextResponse.json({ error: "Start date must be before end date" }, { status: 400 });
    }

    // PERFORMANCE: Limit maximum date range to 2 years to prevent excessive queries
    const maxRangeDays = 730; // 2 years
    const rangeDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    if (rangeDays > maxRangeDays) {
      return NextResponse.json({
        error: `Date range too large. Maximum ${maxRangeDays} days (2 years)`,
        requested: Math.floor(rangeDays),
      }, { status: 400 });
    }

    // Base conditions (security, visibility, user ownership)
    const baseConditions = [
      eq(calendarAccounts.userId, user.id),
      eq(calendarAccounts.isActive, true),
      // eq(calendars.isVisible, true), // REMOVED: Fetch all events to allow client-side toggle
    ];

    if (calendarId) {
      baseConditions.push(eq(events.calendarId, calendarId));
    }

    // IMPORTANT: For recurring events, we DON'T filter by the original event's date
    // because occurrences may fall within the range even if the original event doesn't.
    // Client-side expansion (useRecurringEvents hook) handles the actual filtering.
    // We fetch TWO sets of events:
    // 1. Non-recurring events: filtered by date range (performance optimization)
    // 2. Recurring events: NO date filter (they may have occurrences in range)

    // PERFORMANCE: Fetch both recurring and non-recurring events in a single optimized query
    // For non-recurring: filter by date range
    // For recurring: filter only those that haven't ended yet (recurUntil >= startDate)
    const allEvents = await db
      .select({
        id: events.id,
        title: events.title,
        description: events.description,
        startTime: events.startTime,
        endTime: events.endTime,
        isAllDay: events.isAllDay,
        location: events.location,
        eventColor: events.color,
        calendarColor: calendars.color,
        calendarId: events.calendarId,
        status: events.status,
        isRecurring: events.isRecurring,
        rrule: eventRecurrences.rrule,
        exDates: eventRecurrences.exDates,
        recurUntil: eventRecurrences.recurUntil,
      })
      .from(events)
      .innerJoin(calendars, eq(events.calendarId, calendars.id))
      .innerJoin(calendarAccounts, eq(calendars.accountId, calendarAccounts.id))
      .leftJoin(eventRecurrences, eq(events.id, eventRecurrences.eventId))
      .where(
        and(
          ...baseConditions,
          or(
            // 1. Non-recurring events within the range
            and(
              eq(events.isRecurring, false),
              gte(events.endTime, startDate),
              lte(events.startTime, endDate)
            ),
            // 2. Recurring events that are still active
            and(
              eq(events.isRecurring, true),
              or(
                isNull(eventRecurrences.recurUntil),
                gte(eventRecurrences.recurUntil, startDate)
              )
            )
          )
        )
      )
      // PERFORMANCE: ensure results are streamed in chronological order
      .orderBy(events.startTime);

    // Format the results and deduplicate
    const seen = new Set<string>();
    const formattedEvents = [];

    for (const e of allEvents) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);

      formattedEvents.push({
        id: e.id,
        title: e.title,
        description: e.description,
        startTime: e.startTime,
        endTime: e.endTime,
        isAllDay: e.isAllDay,
        location: e.location,
        color: e.eventColor || e.calendarColor || "#737373",
        calendarId: e.calendarId,
        status: e.status,
        isRecurring: e.isRecurring,
        rrule: e.rrule,
        exDates: e.exDates as string[] | null,
      });
    }

    return NextResponse.json(formattedEvents);
  } catch (error) {
    console.error("GET /api/events error:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    );
  }
}

// POST /api/events
export async function POST(request: NextRequest) {
  try {
    // Accept both JWT (desktop) and session cookies (web)
    const { user } = await verifyRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }
    await ensureUserExists(user);

    const body = await request.json();
    const validated = eventSchema.parse(body);

    let targetCalendarId = validated.calendarId;

    // If no calendarId provided or it's the "local" placeholder, find a suitable default
    if (!targetCalendarId || targetCalendarId === "local") {
      const [calendar] = await db
        .select({ id: calendars.id })
        .from(calendars)
        .innerJoin(calendarAccounts, eq(calendars.accountId, calendarAccounts.id))
        .where(
          and(
            eq(calendarAccounts.userId, user.id),
            eq(calendars.isReadOnly, false)
          )
        )
        .orderBy(desc(calendarAccounts.provider)) // 'local' is high in descending order
        .limit(1);
      
      if (calendar) {
        targetCalendarId = calendar.id;
      }
    }

    if (!targetCalendarId || targetCalendarId === "local") {
      return NextResponse.json({ error: "Geen schrijfdbare kalender gevonden" }, { status: 400 });
    }

    // Quick ownership check with single query
    const [cal] = await db
      .select({ id: calendars.id })
      .from(calendars)
      .innerJoin(calendarAccounts, eq(calendars.accountId, calendarAccounts.id))
      .where(
        and(
          eq(calendars.id, targetCalendarId),
          eq(calendarAccounts.userId, user.id)
        )
      );

    if (!cal) {
      return NextResponse.json({ error: "Kalender niet gevonden" }, { status: 403 });
    }

    const [newEvent] = await db
      .insert(events)
      .values({
        calendarId: targetCalendarId,
        title: validated.title,
        description: validated.description,
        startTime: new Date(validated.startTime),
        endTime: new Date(validated.endTime),
        isAllDay: validated.isAllDay,
        location: validated.location,
        color: validated.color,
        timezone: validated.timezone,
        isRecurring: validated.isRecurring || false,
      })
      .returning();

    // If this is a recurring event, save the RRULE
    if (validated.rrule && validated.isRecurring) {
      try {
        // Parse RRULE to extract until/count if present
        const parsed = parseRRule(validated.rrule);

        await db.insert(eventRecurrences).values({
          eventId: newEvent.id,
          rrule: validated.rrule,
          recurUntil: parsed.until || null,
          recurCount: parsed.count || null,
          exDates: [],
        });
      } catch (error) {
        console.error("Failed to save recurrence rule:", error);
        // Don't fail the whole request if just the recurrence fails
      }
    }

    // Sync to external provider in background - return immediately so user sees event in grid
    const providerInfo = await getCalendarProviderInfo(targetCalendarId);
    if (shouldSyncToProvider(providerInfo)) {
      const syncData = buildEventSyncData({
        title: validated.title,
        startTime: new Date(validated.startTime),
        endTime: new Date(validated.endTime),
        isAllDay: validated.isAllDay,
        location: validated.location,
        description: validated.description,
      });
      const { provider, accountId } = providerInfo;
      const eventId = newEvent.id;
      const calendarId = targetCalendarId!;

      after(async () => {
        try {
          await createAndStoreEventOnProvider(provider, accountId, calendarId, eventId, syncData);
        } catch (syncError) {
          console.error(`Failed to sync new event to ${provider}:`, syncError);
          // Event is saved locally, sync will catch up later
        }
      });
    }

    return NextResponse.json(newEvent, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Ongeldig verzoek", details: error.issues }, { status: 400 });
    }
    console.error("POST /api/events error:", error);
    return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
  }
}

// PUT /api/events (update)
export async function PUT(request: NextRequest) {
  try {
    // Accept both JWT (desktop) and session cookies (web)
    const { user } = await verifyRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: "Event ID is verplicht" }, { status: 400 });
    }

    // Get the existing event to check if calendar changed
    const [existingEvent] = await db.select().from(events).where(eq(events.id, id));
    if (!existingEvent) {
      return NextResponse.json({ error: "Event niet gevonden" }, { status: 404 });
    }

    const calendarChanged = data.calendarId && data.calendarId !== existingEvent.calendarId;

    // If calendar changed, verify ownership of new calendar
    if (calendarChanged) {
      const [newCal] = await db
        .select({ id: calendars.id })
        .from(calendars)
        .innerJoin(calendarAccounts, eq(calendars.accountId, calendarAccounts.id))
        .where(
          and(
            eq(calendars.id, data.calendarId),
            eq(calendarAccounts.userId, user.id)
          )
        );

      if (!newCal) {
        return NextResponse.json({ error: "Nieuwe kalender niet gevonden" }, { status: 403 });
      }
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.startTime !== undefined) updateData.startTime = new Date(data.startTime);
    if (data.endTime !== undefined) updateData.endTime = new Date(data.endTime);
    if (data.isAllDay !== undefined) updateData.isAllDay = data.isAllDay;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.isRecurring !== undefined) updateData.isRecurring = data.isRecurring;
    if (calendarChanged) {
      updateData.calendarId = data.calendarId;
      // Reset external IDs when moving between calendars
      updateData.externalId = null;
      updateData.icsUid = null;
    }

    const [updated] = await db.update(events).set(updateData).where(eq(events.id, id)).returning();
    if (!updated) {
      return NextResponse.json({ error: "Event niet gevonden" }, { status: 404 });
    }

    // Update recurrence rule if provided
    if (data.rrule !== undefined) {
      if (data.rrule && data.isRecurring) {
        // User wants to add or update recurrence
        try {
          const parsed = parseRRule(data.rrule);

          // Check if recurrence already exists
          const [existing] = await db
            .select()
            .from(eventRecurrences)
            .where(eq(eventRecurrences.eventId, id));

          if (existing) {
            // Update existing recurrence
            await db
              .update(eventRecurrences)
              .set({
                rrule: data.rrule,
                recurUntil: parsed.until || null,
                recurCount: parsed.count || null,
              })
              .where(eq(eventRecurrences.eventId, id));
          } else {
            // Create new recurrence
            await db.insert(eventRecurrences).values({
              eventId: id,
              rrule: data.rrule,
              recurUntil: parsed.until || null,
              recurCount: parsed.count || null,
              exDates: [],
            });
          }
        } catch (error) {
          console.error("Failed to update recurrence rule:", error);
        }
      } else {
        // User wants to remove recurrence
        await db.delete(eventRecurrences).where(eq(eventRecurrences.eventId, id));
      }
    }

    // Sync to external provider in background - return immediately so user sees update in grid
    if (calendarChanged) {
      const oldCalendarId = existingEvent.calendarId;
      const oldProviderInfo =
        existingEvent.externalId && oldCalendarId
          ? await getCalendarProviderInfo(oldCalendarId)
          : null;
      const newProviderInfo = await getCalendarProviderInfo(data.calendarId);
      const createSyncData = buildEventSyncData(updated);

      after(async () => {
        try {
          if (shouldSyncToProvider(oldProviderInfo)) {
            console.log(`[Event Move] Deleting event ${id} from old ${oldProviderInfo.provider} calendar ${oldCalendarId}`);
            await deleteEventOnProvider(oldProviderInfo.provider, oldProviderInfo.accountId, oldCalendarId, id);
            console.log(`[Event Move] Successfully deleted from old calendar`);
          }
          if (shouldSyncToProvider(newProviderInfo)) {
            console.log(`[Event Move] Creating event in new ${newProviderInfo.provider} calendar ${data.calendarId}`);
            await createAndStoreEventOnProvider(
              newProviderInfo.provider,
              newProviderInfo.accountId,
              data.calendarId,
              id,
              createSyncData
            );
            console.log(`[Event Move] Successfully created in new calendar`);
          }
        } catch (syncError) {
          console.error(`[Event Move] Sync failed:`, syncError);
        }
      });
    } else if (updated.calendarId) {
      const providerInfo = await getCalendarProviderInfo(updated.calendarId);
      if (shouldSyncToProvider(providerInfo)) {
        const syncData: Partial<EventSyncData> = {};
        if (data.title !== undefined) syncData.title = data.title;
        if (data.description !== undefined) syncData.description = data.description;
        if (data.startTime !== undefined) syncData.startTime = new Date(data.startTime);
        if (data.endTime !== undefined) syncData.endTime = new Date(data.endTime);
        if (data.isAllDay !== undefined) syncData.isAllDay = data.isAllDay;
        if (data.location !== undefined) syncData.location = data.location;

        const hasExternalId = !!updated.externalId;
        const createData = buildEventSyncData(updated);
        const { provider, accountId } = providerInfo;
        const calendarId = updated.calendarId;

        after(async () => {
          try {
            if (!hasExternalId) {
              await createAndStoreEventOnProvider(provider, accountId, calendarId, id, createData);
            } else {
              await updateEventOnProvider(provider, accountId, calendarId, id, syncData);
            }
          } catch (syncError) {
            console.error(`Failed to sync event update to ${provider}:`, syncError);
          }
        });
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/events error:", error);
    return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
  }
}

// DELETE /api/events?id=...
export async function DELETE(request: NextRequest) {
  try {
    // Accept both JWT (desktop) and session cookies (web)
    const { user } = await verifyRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Event ID is verplicht" }, { status: 400 });
    }

    // First get the event info BEFORE deleting (need it for external sync)
    const [eventToDelete] = await db
      .select()
      .from(events)
      .where(eq(events.id, id));

    if (!eventToDelete) {
      return NextResponse.json({ error: "Event niet gevonden" }, { status: 404 });
    }

    // Sync deletion to external provider BEFORE local delete
    if (eventToDelete.calendarId) {
      const providerInfo = await getCalendarProviderInfo(eventToDelete.calendarId);
      if (shouldSyncToProvider(providerInfo)) {
        try {
          await deleteEventOnProvider(
            providerInfo.provider,
            providerInfo.accountId,
            eventToDelete.calendarId,
            id
          );
        } catch (syncError) {
          console.error(`Failed to sync event deletion to ${providerInfo.provider}:`, syncError);
          // Continue with local delete even if sync fails
        }
      }
    }

    await db.delete(events).where(eq(events.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/events error:", error);
    return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
  }
}
