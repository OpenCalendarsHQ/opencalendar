import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events, calendars, calendarAccounts, eventRecurrences } from "@/lib/db/schema";
import { auth } from "@/lib/auth/server";
import { ensureUserExists } from "@/lib/auth/ensure-user";
import { eq, and, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { createICloudEvent, updateICloudEvent, deleteICloudEvent } from "@/lib/sync/icloud";
import { createGoogleEvent, updateGoogleEvent, deleteGoogleEvent } from "@/lib/sync/google";

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
    const { data: session } = await auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const calendarId = searchParams.get("calendarId");

    // Single optimized JOIN query: events + calendars + accounts
    // Filters by userId at the account level (security), with optional date range
    const conditions = [
      eq(calendarAccounts.userId, session.user.id),
      eq(calendarAccounts.isActive, true),
      eq(calendars.isVisible, true),
    ];

    if (start) {
      conditions.push(gte(events.endTime, new Date(start)));
    }
    if (end) {
      conditions.push(lte(events.startTime, new Date(end)));
    }
    if (calendarId) {
      conditions.push(eq(events.calendarId, calendarId));
    }

    // Single optimized query with LEFT JOIN for recurrence rules
    const result = await db
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
      .where(and(...conditions));

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
    const { data: session } = await auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }
    await ensureUserExists(session.user);

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
          eq(calendarAccounts.userId, session.user.id)
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
    const { data: session } = await auth.getSession();
    if (!session?.user) {
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
            eq(calendarAccounts.userId, session.user.id)
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
            if (oldProviderInfo.provider === "icloud") {
              await deleteICloudEvent(oldProviderInfo.accountId, id);
            } else if (oldProviderInfo.provider === "google") {
              await deleteGoogleEvent(oldProviderInfo.accountId, existingEvent.calendarId, id);
            }
          } catch (syncError) {
            console.error(`Failed to delete event from old ${oldProviderInfo.provider} calendar:`, syncError);
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
          if (newProviderInfo.provider === "icloud") {
            const externalUid = await createICloudEvent(newProviderInfo.accountId, data.calendarId, syncData);
            await db.update(events).set({ icsUid: externalUid }).where(eq(events.id, id));
          } else if (newProviderInfo.provider === "google") {
            const externalId = await createGoogleEvent(newProviderInfo.accountId, data.calendarId, syncData);
            if (externalId) {
              await db.update(events).set({ externalId }).where(eq(events.id, id));
            }
          }
        } catch (syncError) {
          console.error(`Failed to create event in new ${newProviderInfo.provider} calendar:`, syncError);
        }
      }
    } else {
      // Just update in the same calendar
      if (updated.calendarId) {
        const providerInfo = await getCalendarProviderInfo(updated.calendarId);
        if (providerInfo && !providerInfo.isReadOnly) {
          try {
            // Build syncData with only the fields that were actually updated
            const syncData: Record<string, any> = {};
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
    const { data: session } = await auth.getSession();
    if (!session?.user) {
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
