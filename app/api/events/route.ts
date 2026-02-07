import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events, calendars, calendarAccounts } from "@/lib/db/schema";
import { auth } from "@/lib/auth/server";
import { ensureUserExists } from "@/lib/auth/ensure-user";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { z } from "zod";

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

/** Get all calendar IDs belonging to the current user */
async function getUserCalendarIds(userId: string): Promise<string[]> {
  const accounts = await db
    .select({ id: calendarAccounts.id })
    .from(calendarAccounts)
    .where(eq(calendarAccounts.userId, userId));

  if (accounts.length === 0) return [];

  const cals = await db
    .select({ id: calendars.id })
    .from(calendars)
    .where(
      inArray(
        calendars.accountId,
        accounts.map((a) => a.id)
      )
    );

  return cals.map((c) => c.id);
}

// GET /api/events?start=...&end=...&calendarId=...
export async function GET(request: NextRequest) {
  try {
    const { data: session } = await auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }
    await ensureUserExists(session.user);

    // Get user's calendar IDs for security filtering
    const userCalendarIds = await getUserCalendarIds(session.user.id);
    if (userCalendarIds.length === 0) {
      return NextResponse.json([]);
    }

    const { searchParams } = new URL(request.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const calendarId = searchParams.get("calendarId");

    const conditions = [
      inArray(events.calendarId, userCalendarIds),
    ];

    if (start) {
      conditions.push(gte(events.endTime, new Date(start)));
    }
    if (end) {
      conditions.push(lte(events.startTime, new Date(end)));
    }
    if (calendarId && userCalendarIds.includes(calendarId)) {
      conditions.push(eq(events.calendarId, calendarId));
    }

    const result = await db
      .select()
      .from(events)
      .where(and(...conditions));

    // Map to frontend-friendly format with calendar color fallback
    const calendarColors = new Map<string, string>();
    if (userCalendarIds.length > 0) {
      const cals = await db
        .select({ id: calendars.id, color: calendars.color })
        .from(calendars)
        .where(inArray(calendars.id, userCalendarIds));
      cals.forEach((c) => calendarColors.set(c.id, c.color));
    }

    const mapped = result.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      startTime: e.startTime,
      endTime: e.endTime,
      isAllDay: e.isAllDay,
      location: e.location,
      color: e.color || calendarColors.get(e.calendarId) || "#737373",
      calendarId: e.calendarId,
      status: e.status,
      isRecurring: e.isRecurring,
    }));

    return NextResponse.json(mapped);
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

    const body = await request.json();
    const validated = eventSchema.parse(body);

    // Verify calendar belongs to user
    const userCalendarIds = await getUserCalendarIds(session.user.id);
    if (!userCalendarIds.includes(validated.calendarId)) {
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

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.startTime !== undefined) updateData.startTime = new Date(data.startTime);
    if (data.endTime !== undefined) updateData.endTime = new Date(data.endTime);
    if (data.isAllDay !== undefined) updateData.isAllDay = data.isAllDay;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.color !== undefined) updateData.color = data.color;

    const [updated] = await db.update(events).set(updateData).where(eq(events.id, id)).returning();
    if (!updated) {
      return NextResponse.json({ error: "Event niet gevonden" }, { status: 404 });
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

    const [deleted] = await db.delete(events).where(eq(events.id, id)).returning();
    if (!deleted) {
      return NextResponse.json({ error: "Event niet gevonden" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/events error:", error);
    return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
  }
}
