import { NextRequest, NextResponse } from "next/server";
import { verifyRequest } from "@/lib/auth/verify-request";
import { db } from "@/lib/db";
import { events, calendars, calendarAccounts, eventRecurrences } from "@/lib/db/schema";
import { eq, and, gte, lte, or, isNull } from "drizzle-orm";

/**
 * GET /api/pulsesync/events?start=YYYY-MM-DD&end=YYYY-MM-DD
 *
 * This endpoint is used by PulseSync to display a user's PulseCalendar events
 * alongside the proposed event dates. Authentication is via Clerk session or
 * Bearer token (Clerk JWT from PulseSync).
 */
export async function GET(request: NextRequest) {
    try {
        // Authenticate via NextAuth (supports both session cookie and Bearer JWT)
        const { user } = await verifyRequest(request);

        if (!user?.id) {
            return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
        }

        const userId = user.id;

        const { searchParams } = new URL(request.url);
        const rawStart = searchParams.get("start");
        const rawEnd = searchParams.get("end");

        if (!rawStart || !rawEnd) {
            return NextResponse.json(
                { error: "start en end zijn verplicht (YYYY-MM-DD)" },
                { status: 400 }
            );
        }

        // Build full datetime range from date strings
        const startDate = new Date(`${rawStart}T00:00:00.000Z`);
        const endDate = new Date(`${rawEnd}T23:59:59.999Z`);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return NextResponse.json({ error: "Ongeldige datum" }, { status: 400 });
        }

        // Fetch events for this user within the date range
        const allEvents = await db
            .select({
                id: events.id,
                title: events.title,
                startTime: events.startTime,
                endTime: events.endTime,
                isAllDay: events.isAllDay,
                color: events.color,
                calendarColor: calendars.color,
                calendarName: calendars.name,
                isRecurring: events.isRecurring,
                rrule: eventRecurrences.rrule,
                recurUntil: eventRecurrences.recurUntil,
                exDates: eventRecurrences.exDates,
            })
            .from(events)
            .innerJoin(calendars, eq(events.calendarId, calendars.id))
            .innerJoin(calendarAccounts, eq(calendars.accountId, calendarAccounts.id))
            .leftJoin(eventRecurrences, eq(events.id, eventRecurrences.eventId))
            .where(
                and(
                    eq(calendarAccounts.userId, userId),
                    eq(calendarAccounts.isActive, true),
                    or(
                        // Non-recurring events in range
                        and(
                            eq(events.isRecurring, false),
                            gte(events.endTime, startDate),
                            lte(events.startTime, endDate)
                        ),
                        // Recurring events that might have occurrences in range
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
            .orderBy(events.startTime);

        // Format response for PulseSync widget
        const seen = new Set<string>();
        const result = [];

        for (const e of allEvents) {
            if (seen.has(e.id)) continue;
            seen.add(e.id);

            result.push({
                id: e.id,
                title: e.title,
                start: e.startTime.toISOString(),
                end: e.endTime.toISOString(),
                isAllDay: e.isAllDay,
                color: e.color || e.calendarColor || "#6b7280",
                calendarName: e.calendarName,
                isRecurring: e.isRecurring,
                rrule: e.rrule ?? null,
            });
        }

        return NextResponse.json(result, {
            headers: {
                // Allow PulseSync to call this endpoint cross-origin
                "Access-Control-Allow-Origin":
                    process.env.NEXT_PUBLIC_PULSESYNC_URL || "http://localhost:3000",
                "Access-Control-Allow-Methods": "GET",
                "Access-Control-Allow-Headers": "Authorization, Content-Type",
                // Cache for 60 seconds (calendar data doesn't change that fast)
                "Cache-Control": "private, max-age=60",
            },
        });
    } catch (error) {
        console.error("[pulsesync/events] Error:", error);
        return NextResponse.json({ error: "Interne fout" }, { status: 500 });
    }
}

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, {
        status: 200,
        headers: {
            "Access-Control-Allow-Origin":
                process.env.NEXT_PUBLIC_PULSESYNC_URL || "http://localhost:3000",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Authorization, Content-Type",
        },
    });
}
