import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calendarAccounts, calendars } from "@/lib/db/schema";
import { getUser } from "@/lib/auth/server";
import { ensureUserExists } from "@/lib/auth/ensure-user";
import { eq, and } from "drizzle-orm";
import {
  testICloudConnection,
  syncICloudCalendars,
  syncICloudEvents,
} from "@/lib/sync/icloud";

// POST /api/sync/icloud - Connect iCloud account or trigger sync
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    await ensureUserExists({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.user_metadata?.name,
      image: user.user_metadata?.avatar_url,
    });

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

      // Use upsert to handle both insert and update (one iCloud account per user)
      const [newAccount] = await db
        .insert(calendarAccounts)
        .values({
          userId: user.id,
          provider: "icloud",
          email,
          accessToken: appPassword,
        })
        .onConflictDoUpdate({
          target: [calendarAccounts.userId, calendarAccounts.provider],
          set: {
            email,
            accessToken: appPassword,
            isActive: true,
            updatedAt: new Date(),
          },
        })
        .returning();

      // Start background sync (fire-and-forget)
      // Don't await - let it run in the background
      (async () => {
        try {
          await syncICloudCalendars(newAccount.id);

          // Now sync events for visible calendars only
          const cals = await db
            .select()
            .from(calendars)
            .where(
              and(
                eq(calendars.accountId, newAccount.id),
                eq(calendars.isVisible, true)
              )
            );

          await Promise.allSettled(
            cals.map((cal) => syncICloudEvents(newAccount.id, cal.id))
          );

          // Update last sync time
          await db
            .update(calendarAccounts)
            .set({ lastSyncAt: new Date(), updatedAt: new Date() })
            .where(eq(calendarAccounts.id, newAccount.id));

          console.log(`✅ Background sync completed for ${email}: ${cals.length} calendars`);
        } catch (error) {
          console.error("Background iCloud sync failed:", error);
        }
      })();

      // Return immediately - sync continues in background
      return NextResponse.json({
        id: newAccount.id,
        email: newAccount.email,
        provider: "icloud",
        message: "iCloud verbonden - synchronisatie loopt op de achtergrond",
        syncing: true,
      });
    }

    // Trigger sync for an existing account
    if (action === "sync" && accountId) {
      const [account] = await db
        .select()
        .from(calendarAccounts)
        .where(eq(calendarAccounts.id, accountId));

      if (!account || account.userId !== user.id) {
        return NextResponse.json({ error: "Account niet gevonden" }, { status: 404 });
      }

      try {
        // Sync calendars
        await syncICloudCalendars(accountId);

        // Sync events for visible calendars only (skip hidden calendars)
        const cals = await db
          .select()
          .from(calendars)
          .where(
            and(
              eq(calendars.accountId, accountId),
              eq(calendars.isVisible, true)
            )
          );

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
      } catch (error) {
        // Check if it's an invalid credentials error
        if (error instanceof Error && error.message.includes("Invalid credentials")) {
          return NextResponse.json({
            error: "invalid_credentials",
            message: "Je iCloud-inloggegevens zijn verlopen of incorrect. Verwijder het account en voeg het opnieuw toe met een nieuw app-wachtwoord.",
          }, { status: 401 });
        }
        throw error; // Re-throw other errors
      }
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
