import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calendars, calendarAccounts } from "@/lib/db/schema";
import { auth } from "@/lib/auth/server";
import { ensureUserExists } from "@/lib/auth/ensure-user";
import { eq } from "drizzle-orm";

// GET /api/calendars - Get all calendars for the current user
export async function GET() {
  try {
    const { data: session } = await auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    await ensureUserExists(session.user);

    // Get all calendar accounts for the user, with their calendars
    const accounts = await db
      .select()
      .from(calendarAccounts)
      .where(eq(calendarAccounts.userId, session.user.id));

    const result = await Promise.all(
      accounts.map(async (account) => {
        const cals = await db
          .select()
          .from(calendars)
          .where(eq(calendars.accountId, account.id));

        return {
          id: account.id,
          provider: account.provider,
          email: account.email,
          lastSyncAt: account.lastSyncAt,
          isActive: account.isActive,
          calendars: cals.map((cal) => ({
            id: cal.id,
            name: cal.name,
            color: cal.color,
            isVisible: cal.isVisible,
            isReadOnly: cal.isReadOnly,
            isPrimary: cal.isPrimary,
          })),
        };
      })
    );

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
    const { data: session } = await auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    await ensureUserExists(session.user);

    const body = await request.json();
    const { name, color } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Naam is verplicht" },
        { status: 400 }
      );
    }

    // Ensure a local account exists for the user
    let [localAccount] = await db
      .select()
      .from(calendarAccounts)
      .where(eq(calendarAccounts.userId, session.user.id))
      .limit(1);

    if (!localAccount) {
      [localAccount] = await db
        .insert(calendarAccounts)
        .values({
          userId: session.user.id,
          provider: "local",
          email: session.user.email || "local",
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
