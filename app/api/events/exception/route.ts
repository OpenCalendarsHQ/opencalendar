import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events, eventRecurrences, calendars, calendarAccounts } from "@/lib/db/schema";
import { verifyRequest } from "@/lib/auth/verify-request";
import { eq, and } from "drizzle-orm";
import { updateICloudEvent } from "@/lib/sync/icloud";
import { updateGoogleEvent } from "@/lib/sync/google";

/**
 * POST /api/events/exception
 * Add an exception date (EXDATE) to a recurring event
 */
export async function POST(request: NextRequest) {
  try {
    // Accept both JWT (desktop) and session cookies (web)
    const { user } = await verifyRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const body = await request.json();
    const { eventId, exceptionDate } = body;

    if (!eventId || !exceptionDate) {
      return NextResponse.json(
        { error: "Event ID en exception date zijn verplicht" },
        { status: 400 }
      );
    }

    // Get the event and verify ownership
    const [event] = await db
      .select({
        id: events.id,
        calendarId: events.calendarId,
        externalId: events.externalId,
        isRecurring: events.isRecurring,
      })
      .from(events)
      .innerJoin(calendars, eq(events.calendarId, calendars.id))
      .innerJoin(calendarAccounts, eq(calendars.accountId, calendarAccounts.id))
      .where(
        and(
          eq(events.id, eventId),
          eq(calendarAccounts.userId, user.id)
        )
      );

    if (!event) {
      return NextResponse.json({ error: "Event niet gevonden" }, { status: 404 });
    }

    if (!event.isRecurring) {
      return NextResponse.json(
        { error: "Dit is geen herhalend evenement" },
        { status: 400 }
      );
    }

    // Get existing recurrence data
    const [recurrence] = await db
      .select()
      .from(eventRecurrences)
      .where(eq(eventRecurrences.eventId, eventId));

    if (!recurrence) {
      return NextResponse.json(
        { error: "Herhaling data niet gevonden" },
        { status: 404 }
      );
    }

    // Add the exception date to the exDates array
    const currentExDates = (recurrence.exDates as string[]) || [];

    // Normalize the exception date (remove time if needed for comparison)
    const normalizedExDate = new Date(exceptionDate).toISOString();

    // Check if this date is already in the exception list
    if (currentExDates.includes(normalizedExDate)) {
      return NextResponse.json(
        { error: "Deze datum is al een uitzondering" },
        { status: 400 }
      );
    }

    const updatedExDates = [...currentExDates, normalizedExDate];

    // Update the eventRecurrences table
    await db
      .update(eventRecurrences)
      .set({ exDates: updatedExDates })
      .where(eq(eventRecurrences.id, recurrence.id));

    // Sync to external provider
    const [calendarInfo] = await db
      .select({
        accountId: calendarAccounts.id,
        provider: calendarAccounts.provider,
        isReadOnly: calendars.isReadOnly,
      })
      .from(calendars)
      .innerJoin(calendarAccounts, eq(calendars.accountId, calendarAccounts.id))
      .where(eq(calendars.id, event.calendarId));

    if (calendarInfo && !calendarInfo.isReadOnly && event.externalId) {
      try {
        // Update the event on the external provider with the new EXDATE
        if (calendarInfo.provider === "icloud") {
          // updateICloudEvent will automatically include the EXDATE from the database
          await updateICloudEvent(calendarInfo.accountId, event.calendarId, eventId, {});
          console.log(`✅ EXDATE synced to iCloud for event ${eventId}`);
        } else if (calendarInfo.provider === "google") {
          // Google Calendar handles recurring exceptions differently
          // For now, rely on periodic sync
          console.log(`EXDATE added to event ${eventId}, Google sync pending`);
        }
      } catch (syncError) {
        console.error(`Failed to sync EXDATE to ${calendarInfo.provider}:`, syncError);
        // Continue - local update was successful, will sync later
      }
    }

    return NextResponse.json({
      success: true,
      exDates: updatedExDates,
    });
  } catch (error) {
    console.error("POST /api/events/exception error:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    );
  }
}
