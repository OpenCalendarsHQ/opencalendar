import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calendarAccounts, calendars } from "@/lib/db/schema";
import { auth } from "@/lib/auth/server";
import { ensureUserExists } from "@/lib/auth/ensure-user";
import { eq } from "drizzle-orm";
import {
  testICloudConnection,
  syncICloudCalendars,
  syncICloudEvents,
} from "@/lib/sync/icloud";

// POST /api/sync/icloud - Connect iCloud account or trigger sync
export async function POST(request: NextRequest) {
  try {
    const { data: session } = await auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    await ensureUserExists(session.user);

    const body = await request.json();
    const { action, email, appPassword, accountId } = body;

    // Connect a new iCloud account
    if (action === "connect") {
      if (!email || !appPassword) {
        return NextResponse.json(
          { error: "E-mail en app-wachtwoord zijn verplicht" },
          { status: 400 }
        );
      }

      // Test the connection first
      const isValid = await testICloudConnection(email, appPassword);
      if (!isValid) {
        return NextResponse.json(
          { error: "Kan geen verbinding maken met iCloud. Controleer je Apple ID en app-specifiek wachtwoord." },
          { status: 400 }
        );
      }

      // Save the account
      const [newAccount] = await db
        .insert(calendarAccounts)
        .values({
          userId: session.user.id,
          provider: "icloud",
          email,
          accessToken: appPassword,
        })
        .returning();

      // Sync calendars AND events immediately
      let syncedCalendars = 0;
      let syncedEvents = 0;
      const syncErrors: string[] = [];

      try {
        await syncICloudCalendars(newAccount.id);

        // Now sync events for all calendars
        const cals = await db
          .select()
          .from(calendars)
          .where(eq(calendars.accountId, newAccount.id));

        syncedCalendars = cals.length;

        const results = await Promise.allSettled(
          cals.map((cal) => syncICloudEvents(newAccount.id, cal.id))
        );

        results.forEach((r, i) => {
          if (r.status === "fulfilled") {
            syncedEvents++;
          } else {
            syncErrors.push(`${cals[i].name}: ${r.reason?.message || "Onbekende fout"}`);
            console.error(`Event sync failed for calendar ${cals[i].name}:`, r.reason);
          }
        });

        // Update last sync time
        await db
          .update(calendarAccounts)
          .set({ lastSyncAt: new Date(), updatedAt: new Date() })
          .where(eq(calendarAccounts.id, newAccount.id));
      } catch (error) {
        console.error("Initial iCloud sync failed:", error);
        syncErrors.push(error instanceof Error ? error.message : "Sync mislukt");
      }

      return NextResponse.json({
        id: newAccount.id,
        email: newAccount.email,
        provider: "icloud",
        syncedCalendars,
        syncedEvents,
        syncErrors,
        message: `iCloud verbonden: ${syncedCalendars} kalender(s), ${syncedEvents} gesynchroniseerd`,
      });
    }

    // Trigger sync for an existing account
    if (action === "sync" && accountId) {
      const [account] = await db
        .select()
        .from(calendarAccounts)
        .where(eq(calendarAccounts.id, accountId));

      if (!account || account.userId !== session.user.id) {
        return NextResponse.json({ error: "Account niet gevonden" }, { status: 404 });
      }

      // Sync calendars
      await syncICloudCalendars(accountId);

      // Sync events for all calendars
      const cals = await db
        .select()
        .from(calendars)
        .where(eq(calendars.accountId, accountId));

      const results = await Promise.allSettled(
        cals.map((cal) => syncICloudEvents(accountId, cal.id))
      );

      // Update last sync time
      await db
        .update(calendarAccounts)
        .set({ lastSyncAt: new Date(), updatedAt: new Date() })
        .where(eq(calendarAccounts.id, accountId));

      const errors = results
        .filter((r) => r.status === "rejected")
        .map((r) => (r as PromiseRejectedResult).reason?.message);

      return NextResponse.json({
        success: true,
        calendarsSync: cals.length,
        errors,
        message: `${cals.length - errors.length}/${cals.length} kalenders gesynchroniseerd`,
      });
    }

    return NextResponse.json(
      { error: "Ongeldig verzoek. Gebruik action: 'connect' of 'sync'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("POST /api/sync/icloud error:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    );
  }
}
