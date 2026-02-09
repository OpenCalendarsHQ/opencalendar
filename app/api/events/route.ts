import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events, calendars, calendarAccounts, eventRecurrences } from "@/lib/db/schema";
import { verifyRequest } from "@/lib/auth/verify-request";
import { ensureUserExists } from "@/lib/auth/ensure-user";
import { eq, and, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { createICloudEvent, updateICloudEvent, deleteICloudEvent } from "@/lib/sync/icloud";
import { createGoogleEvent, updateGoogleEvent, deleteGoogleEvent } from "@/lib/sync/google";
import { rateLimit, rateLimitConfigs } from "@/lib/rate-limit";

// Type for event sync data to avoid using 'any'
interface EventSyncData {
  title?: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  isAllDay?: boolean;
  location?: string;
}

/**
 * Get the provider and account info for a calendar.
 */
async function getCalendarProviderInfo(calendarId: string) {
  const [result] = await db
    .select({
      calendarId: calendars.id,
      accountId: calendarAccounts.id,
      provider: calendarAccounts.provider,
      isReadOnly: calendars.isReadOnly,
    })
    .from(calendars)
    .innerJoin(calendarAccounts, eq(calendars.accountId, calendarAccounts.id))
    .where(eq(calendars.id, calendarId));

  return result || null;
}

const eventSchema = z.object({
  calendarId: z.string().uuid(),
  title: z.string().min(1).default("(Geen titel)"),
  description: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  isAllDay: z.boolean().default(false),
  location: z.string().optional(),
  color: z.string().optional(),
  timezone: z.string().default("Europe/Amsterdam"),
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
      eq(calendars.isVisible, true),
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

    // Fetch non-recurring events with date filter
    const nonRecurringEvents = await db
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
      })
      .from(events)
      .innerJoin(calendars, eq(events.calendarId, calendars.id))
      .innerJoin(calendarAccounts, eq(calendars.accountId, calendarAccounts.id))
      .leftJoin(eventRecurrences, eq(events.id, eventRecurrences.eventId))
      .where(
        and(
          ...baseConditions,
          eq(events.isRecurring, false),
          gte(events.endTime, startDate),
          lte(events.startTime, endDate)
        )
      );

    // Fetch recurring events WITHOUT date filter
    const recurringEvents = await db
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
      })
      .from(events)
      .innerJoin(calendars, eq(events.calendarId, calendars.id))
      .innerJoin(calendarAccounts, eq(calendars.accountId, calendarAccounts.id))
      .leftJoin(eventRecurrences, eq(events.id, eventRecurrences.eventId))
      .where(
        and(
          ...baseConditions,
          eq(events.isRecurring, true)
        )
      );

    // Combine results
    const result = [...nonRecurringEvents, ...recurringEvents];

    // Format the results and deduplicate (LEFT JOIN can create duplicates if there are multiple recurrence entries)
    const seen = new Set<string>();
    const formattedEvents = result
      .filter((e) => {
        if (seen.has(e.id)) return false;
        seen.add(e.id);
        return true;
      })
      .map((e) => ({
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
      }));

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

    // Quick ownership check with single query
    const [cal] = await db
      .select({ id: calendars.id })
      .from(calendars)
      .innerJoin(calendarAccounts, eq(calendars.accountId, calendarAccounts.id))
      .where(
        and(
          eq(calendars.id, validated.calendarId),
          eq(calendarAccounts.userId, user.id)
        )
      );

    if (!cal) {
      return NextResponse.json({ error: "Kalender niet gevonden" }, { status: 403 });
    }

    const [newEvent] = await db
      .insert(events)
      .values({
        calendarId: validated.calendarId,
        title: validated.title,
        description: validated.description,
        startTime: new Date(validated.startTime),
        endTime: new Date(validated.endTime),
        isAllDay: validated.isAllDay,
        location: validated.location,
        color: validated.color,
        timezone: validated.timezone,
      })
      .returning();

    // Sync to external provider (non-blocking: don't fail if sync fails)
    const providerInfo = await getCalendarProviderInfo(validated.calendarId);
    if (providerInfo && !providerInfo.isReadOnly) {
      const syncData = {
        title: validated.title,
        startTime: new Date(validated.startTime),
        endTime: new Date(validated.endTime),
        isAllDay: validated.isAllDay,
        location: validated.location,
        description: validated.description,
      };

      try {
        if (providerInfo.provider === "icloud") {
          const externalUid = await createICloudEvent(providerInfo.accountId, validated.calendarId, syncData);
          // Store the external UID for future updates
          await db.update(events).set({ icsUid: externalUid }).where(eq(events.id, newEvent.id));
        } else if (providerInfo.provider === "google") {
          const externalId = await createGoogleEvent(providerInfo.accountId, validated.calendarId, syncData);
          if (externalId) {
            await db.update(events).set({ externalId }).where(eq(events.id, newEvent.id));
          }
        }
      } catch (syncError) {
        console.error(`Failed to sync new event to ${providerInfo.provider}:`, syncError);
        // Event is saved locally, sync will catch up later
      }
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

    // Handle calendar change: delete from old, create in new
    if (calendarChanged) {
      // Delete from old calendar's external provider
      if (existingEvent.externalId && existingEvent.calendarId) {
        const oldProviderInfo = await getCalendarProviderInfo(existingEvent.calendarId);
        if (oldProviderInfo && !oldProviderInfo.isReadOnly) {
          try {
            console.log(`[Event Move] Deleting event ${id} from old ${oldProviderInfo.provider} calendar ${existingEvent.calendarId}`);
            if (oldProviderInfo.provider === "icloud") {
              await deleteICloudEvent(oldProviderInfo.accountId, id);
            } else if (oldProviderInfo.provider === "google") {
              await deleteGoogleEvent(oldProviderInfo.accountId, existingEvent.calendarId, id);
            }
            console.log(`[Event Move] Successfully deleted from old calendar`);
          } catch (syncError) {
            console.error(`[Event Move] FAILED to delete event from old ${oldProviderInfo.provider} calendar:`, syncError);
            // Don't continue if deletion failed - this prevents duplicates
            return NextResponse.json(
              { error: `Failed to delete event from old calendar: ${syncError}` },
              { status: 500 }
            );
          }
        }
      }

      // Create in new calendar's external provider
      const newProviderInfo = await getCalendarProviderInfo(data.calendarId);
      if (newProviderInfo && !newProviderInfo.isReadOnly) {
        const syncData = {
          title: updated.title,
          startTime: updated.startTime,
          endTime: updated.endTime,
          isAllDay: updated.isAllDay,
          location: updated.location || undefined,
          description: updated.description || undefined,
        };

        try {
          console.log(`[Event Move] Creating event in new ${newProviderInfo.provider} calendar ${data.calendarId}`);
          if (newProviderInfo.provider === "icloud") {
            const externalUid = await createICloudEvent(newProviderInfo.accountId, data.calendarId, syncData);
            await db.update(events).set({ icsUid: externalUid }).where(eq(events.id, id));
          } else if (newProviderInfo.provider === "google") {
            const externalId = await createGoogleEvent(newProviderInfo.accountId, data.calendarId, syncData);
            if (externalId) {
              await db.update(events).set({ externalId }).where(eq(events.id, id));
            }
          }
          console.log(`[Event Move] Successfully created in new calendar`);
        } catch (syncError) {
          console.error(`[Event Move] FAILED to create event in new ${newProviderInfo.provider} calendar:`, syncError);
          return NextResponse.json(
            { error: `Failed to create event in new calendar: ${syncError}` },
            { status: 500 }
          );
        }
      }
    } else {
      // Just update in the same calendar
      if (updated.calendarId) {
        const providerInfo = await getCalendarProviderInfo(updated.calendarId);
        if (providerInfo && !providerInfo.isReadOnly) {
          try {
            // Build syncData with only the fields that were actually updated
            const syncData: EventSyncData = {};
            if (data.title !== undefined) syncData.title = data.title;
            if (data.description !== undefined) syncData.description = data.description;
            if (data.startTime !== undefined) syncData.startTime = new Date(data.startTime);
            if (data.endTime !== undefined) syncData.endTime = new Date(data.endTime);
            if (data.isAllDay !== undefined) syncData.isAllDay = data.isAllDay;
            if (data.location !== undefined) syncData.location = data.location;

            // If no externalId exists, try to create the event remotely first
            if (!updated.externalId) {
              const createData = {
                title: updated.title,
                startTime: updated.startTime,
                endTime: updated.endTime,
                isAllDay: updated.isAllDay,
                location: updated.location || undefined,
                description: updated.description || undefined,
              };

              if (providerInfo.provider === "icloud") {
                const externalUid = await createICloudEvent(providerInfo.accountId, updated.calendarId, createData);
                await db.update(events).set({ icsUid: externalUid }).where(eq(events.id, id));
              } else if (providerInfo.provider === "google") {
                const externalId = await createGoogleEvent(providerInfo.accountId, updated.calendarId, createData);
                if (externalId) {
                  await db.update(events).set({ externalId }).where(eq(events.id, id));
                }
              }
            } else {
              // Update existing external event
              if (providerInfo.provider === "icloud") {
                await updateICloudEvent(providerInfo.accountId, updated.calendarId, id, syncData);
              } else if (providerInfo.provider === "google") {
                await updateGoogleEvent(providerInfo.accountId, updated.calendarId, id, syncData);
              }
            }
          } catch (syncError) {
            console.error(`Failed to sync event update to ${providerInfo.provider}:`, syncError);
          }
        }
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
      if (providerInfo && !providerInfo.isReadOnly) {
        try {
          if (providerInfo.provider === "icloud") {
            await deleteICloudEvent(providerInfo.accountId, id);
          } else if (providerInfo.provider === "google") {
            await deleteGoogleEvent(providerInfo.accountId, eventToDelete.calendarId, id);
          }
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
