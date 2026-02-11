import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calendars, calendarAccounts, events, syncStates } from "@/lib/db/schema";
import { verifyRequest } from "@/lib/auth/verify-request";
import { ensureUserExists } from "@/lib/auth/ensure-user";
import { eq, inArray, and } from "drizzle-orm";

// GET /api/calendars - Get all calendars for the current user
export async function GET(request: NextRequest) {
  try {
    // Accept both JWT (desktop) and session cookies (web)
    const { user } = await verifyRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    // PERFORMANCE: Use simple query without ensureUserExists for GET requests
    // to reduce overhead on every refresh.

    const results = await db
      .select({
        accountId: calendarAccounts.id,
        provider: calendarAccounts.provider,
        email: calendarAccounts.email,
        lastSyncAt: calendarAccounts.lastSyncAt,
        isActive: calendarAccounts.isActive,
        calendarId: calendars.id,
        calendarName: calendars.name,
        calendarColor: calendars.color,
        calendarIsVisible: calendars.isVisible,
        calendarIsReadOnly: calendars.isReadOnly,
        calendarIsPrimary: calendars.isPrimary,
      })
      .from(calendarAccounts)
      .leftJoin(calendars, eq(calendars.accountId, calendarAccounts.id))
      .where(eq(calendarAccounts.userId, user.id));

    // Group calendars by account
    const accountsMap = new Map<string, any>();

    for (const row of results) {
      if (!accountsMap.has(row.accountId)) {
        accountsMap.set(row.accountId, {
          id: row.accountId,
          provider: row.provider,
          email: row.email,
          lastSyncAt: row.lastSyncAt,
          isActive: row.isActive,
          calendars: [],
        });
      }

      if (row.calendarId) {
        accountsMap.get(row.accountId).calendars.push({
          id: row.calendarId,
          name: row.calendarName,
          color: row.calendarColor,
          isVisible: row.calendarIsVisible,
          isReadOnly: row.calendarIsReadOnly,
          isPrimary: row.calendarIsPrimary,
        });
      }
    }

    const result = Array.from(accountsMap.values());

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "private, max-age=10, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("GET /api/calendars error:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    );
  }
}

// POST /api/calendars - Create a local calendar
export async function POST(request: NextRequest) {
  try {
    const { user } = await verifyRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    await ensureUserExists(user);

    const body = await request.json();
    const { name, color } = body;

    if (!name) {
      return NextResponse.json({ error: "Naam is verplicht" }, { status: 400 });
    }

    let localAccountResults = await db
      .select()
      .from(calendarAccounts)
      .where(
        and(
          eq(calendarAccounts.userId, user.id),
          eq(calendarAccounts.provider, "local")
        )
      )
      .limit(1);

    let localAccount = localAccountResults[0];

    if (!localAccount) {
      [localAccount] = await db
        .insert(calendarAccounts)
        .values({
          userId: user.id,
          provider: "local",
          email: user.email || "local",
        })
        .returning();
    }

    const [newCalendar] = await db
      .insert(calendars)
      .values({
        accountId: localAccount.id,
        name,
        color: color || "#3b82f6",
      })
      .returning();

    return NextResponse.json(newCalendar, { status: 201 });
  } catch (error) {
    console.error("POST /api/calendars error:", error);
    return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
  }
}

// PATCH /api/calendars - Update calendar color/visibility/name
export async function PATCH(request: NextRequest) {
  try {
    const { user } = await verifyRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const body = await request.json();
    const { id, color, isVisible, name } = body;

    if (!id) {
      return NextResponse.json({ error: "Calendar ID is verplicht" }, { status: 400 });
    }

    const [cal] = await db.select().from(calendars).where(eq(calendars.id, id));
    if (!cal) {
      return NextResponse.json({ error: "Kalender niet gevonden" }, { status: 404 });
    }

    const [account] = await db.select().from(calendarAccounts).where(eq(calendarAccounts.id, cal.accountId));
    if (!account || account.userId !== user.id) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (color !== undefined) updateData.color = color;
    if (isVisible !== undefined) updateData.isVisible = isVisible;
    if (name !== undefined) updateData.name = name;

    const [updated] = await db
      .update(calendars)
      .set(updateData)
      .where(eq(calendars.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/calendars error:", error);
    return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
  }
}

// DELETE /api/calendars - Delete a calendar or an account
// ?calendarId=... - Delete a single calendar
// ?accountId=... - Delete a connected account and all its calendars
export async function DELETE(request: NextRequest) {
  try {
    const { user } = await verifyRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const calendarId = searchParams.get("calendarId");
    const accountId = searchParams.get("accountId");

    // DELETE individual calendar
    if (calendarId) {
      // Get calendar and verify ownership
      const [calendar] = await db
        .select()
        .from(calendars)
        .where(eq(calendars.id, calendarId));

      if (!calendar) {
        return NextResponse.json({ error: "Kalender niet gevonden" }, { status: 404 });
      }

      // Verify user owns the account this calendar belongs to
      const [account] = await db
        .select()
        .from(calendarAccounts)
        .where(eq(calendarAccounts.id, calendar.accountId));

      if (!account || account.userId !== user.id) {
        return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
      }

      // Only allow deleting local calendars
      if (account.provider !== "local") {
        return NextResponse.json(
          { error: "Alleen lokale kalenders kunnen individueel worden verwijderd" },
          { status: 400 }
        );
      }

      // Delete related data
      await db.delete(events).where(eq(events.calendarId, calendarId));
      await db.delete(syncStates).where(eq(syncStates.calendarId, calendarId));
      await db.delete(calendars).where(eq(calendars.id, calendarId));

      return NextResponse.json({ success: true, message: "Kalender verwijderd" });
    }

    // DELETE entire account
    if (accountId) {
      const [account] = await db
        .select()
        .from(calendarAccounts)
        .where(eq(calendarAccounts.id, accountId));

      if (!account || account.userId !== user.id) {
        return NextResponse.json({ error: "Account niet gevonden" }, { status: 404 });
      }

      const accountCalendars = await db
        .select({ id: calendars.id })
        .from(calendars)
        .where(eq(calendars.accountId, accountId));

      const calendarIds = accountCalendars.map((c) => c.id);

      if (calendarIds.length > 0) {
        await db.delete(events).where(inArray(events.calendarId, calendarIds));
        await db.delete(syncStates).where(inArray(syncStates.calendarId, calendarIds));
        await db.delete(calendars).where(eq(calendars.accountId, accountId));
      }

      await db.delete(calendarAccounts).where(eq(calendarAccounts.id, accountId));

      return NextResponse.json({ success: true, message: "Account verwijderd" });
    }

    return NextResponse.json(
      { error: "calendarId of accountId parameter is verplicht" },
      { status: 400 }
    );
  } catch (error) {
    console.error("DELETE /api/calendars error:", error);
    return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
  }
}
