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

    await ensureUserExists(user);

    // OPTIMIZED: Single query with LEFT JOIN instead of N+1 queries
    // This reduces database round-trips from 1+N to just 1
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

      // Only add calendar if it exists (LEFT JOIN might return null)
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

    return NextResponse.json(result);
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
    // Accept both JWT (desktop) and session cookies (web)
    const { user } = await verifyRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    await ensureUserExists(user);

    const body = await request.json();
    const { name, color } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Naam is verplicht" },
        { status: 400 }
      );
    }

    // Ensure a local account exists for the user
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
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    );
  }
}

// PATCH /api/calendars - Update calendar color/visibility/name
export async function PATCH(request: NextRequest) {
  try {
    // Accept both JWT (desktop) and session cookies (web)
    const { user } = await verifyRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const body = await request.json();
    const { id, color, isVisible, name } = body;

    if (!id) {
      return NextResponse.json({ error: "Calendar ID is verplicht" }, { status: 400 });
    }

    // Verify calendar belongs to user
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

// DELETE /api/calendars?accountId=... - Delete a connected account and all its data
export async function DELETE(request: NextRequest) {
  try {
    // Accept both JWT (desktop) and session cookies (web)
    const { user } = await verifyRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");

    if (!accountId) {
      return NextResponse.json({ error: "Account ID is verplicht" }, { status: 400 });
    }

    // Verify the account belongs to this user
    const [account] = await db
      .select()
      .from(calendarAccounts)
      .where(eq(calendarAccounts.id, accountId));

    if (!account || account.userId !== user.id) {
      return NextResponse.json({ error: "Account niet gevonden" }, { status: 404 });
    }

    // Get all calendar IDs for this account
    const accountCalendars = await db
      .select({ id: calendars.id })
      .from(calendars)
      .where(eq(calendars.accountId, accountId));

    const calendarIds = accountCalendars.map((c) => c.id);

    if (calendarIds.length > 0) {
      // Delete all events for these calendars
      await db
        .delete(events)
        .where(inArray(events.calendarId, calendarIds));

      // Delete all sync states for these calendars
      await db
        .delete(syncStates)
        .where(inArray(syncStates.calendarId, calendarIds));

      // Delete all calendars for this account
      await db
        .delete(calendars)
        .where(eq(calendars.accountId, accountId));
    }

    // Delete the account itself
    await db
      .delete(calendarAccounts)
      .where(eq(calendarAccounts.id, accountId));

    return NextResponse.json({ success: true, message: "Account en alle bijbehorende data verwijderd" });
  } catch (error) {
    console.error("DELETE /api/calendars error:", error);
    return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
  }
}
