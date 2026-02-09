import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calendarAccounts, calendars } from "@/lib/db/schema";
import { auth } from "@/lib/auth/server";
import { ensureUserExists } from "@/lib/auth/ensure-user";
import { eq, and } from "drizzle-orm";
import {
  exchangeCodeForToken,
  getMicrosoftUserProfile,
  syncMicrosoftCalendars,
  syncMicrosoftEvents,
} from "@/lib/sync/microsoft";

// GET /api/sync/microsoft/callback - OAuth callback
export async function GET(request: NextRequest) {
  try {
    const { data: session } = await auth.getSession({
      fetchOptions: { headers: request.headers },
    });

    if (!session?.user) {
      return NextResponse.redirect(
        new URL("/auth/sign-in?error=not_authenticated", request.url)
      );
    }

    await ensureUserExists(session.user);

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        new URL(`/settings?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/settings?error=no_code", request.url)
      );
    }

    const redirectUri = process.env.MICROSOFT_REDIRECT_URI;
    if (!redirectUri) {
      return NextResponse.redirect(
        new URL("/settings?error=config_error", request.url)
      );
    }

    // Exchange code for tokens
    const tokenResponse = await exchangeCodeForToken(code, redirectUri);

    // Get user profile
    const profile = await getMicrosoftUserProfile(tokenResponse.access_token);
    const email = profile.mail || profile.userPrincipalName || "";

    if (!email) {
      return NextResponse.redirect(
        new URL("/settings?error=no_email", request.url)
      );
    }

    const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);

    // Use upsert to handle both insert and update (one Microsoft account per user)
    const [account] = await db
      .insert(calendarAccounts)
      .values({
        userId: session.user.id,
        provider: "microsoft",
        email,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        tokenExpiresAt: expiresAt,
      })
      .onConflictDoUpdate({
        target: [calendarAccounts.userId, calendarAccounts.provider],
        set: {
          email,
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token,
          tokenExpiresAt: expiresAt,
          isActive: true,
          updatedAt: new Date(),
        },
      })
      .returning();

    const accountId = account.id;

    // Start background sync (fire-and-forget)
    (async () => {
      try {
        await syncMicrosoftCalendars(accountId);

        // Now sync events for all calendars
        const cals = await db
          .select()
          .from(calendars)
          .where(eq(calendars.accountId, accountId));

        await Promise.allSettled(
          cals.map((cal) => syncMicrosoftEvents(accountId, cal.id))
        );

        // Update last sync time
        await db
          .update(calendarAccounts)
          .set({ lastSyncAt: new Date(), updatedAt: new Date() })
          .where(eq(calendarAccounts.id, accountId));

        console.log(
          `✅ Background sync completed for ${email}: ${cals.length} calendars`
        );
      } catch (error) {
        console.error("Background Microsoft sync failed:", error);
      }
    })();

    // Redirect to settings with success message
    return NextResponse.redirect(
      new URL("/settings?connected=microsoft", request.url)
    );
  } catch (error) {
    console.error("Microsoft OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/settings?error=auth_failed", request.url)
    );
  }
}

// POST /api/sync/microsoft/callback - Trigger sync for existing account
export async function POST(request: NextRequest) {
  try {
    const { data: session } = await auth.getSession({
      fetchOptions: { headers: request.headers },
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    await ensureUserExists(session.user);

    const body = await request.json();
    const { accountId } = body;

    if (!accountId) {
      return NextResponse.json(
        { error: "accountId is verplicht" },
        { status: 400 }
      );
    }

    const [account] = await db
      .select()
      .from(calendarAccounts)
      .where(eq(calendarAccounts.id, accountId));

    if (!account || account.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Account niet gevonden" },
        { status: 404 }
      );
    }

    // Sync calendars
    await syncMicrosoftCalendars(accountId);

    // Sync events for all calendars
    const cals = await db
      .select()
      .from(calendars)
      .where(eq(calendars.accountId, accountId));

    const results = await Promise.allSettled(
      cals.map((cal) => syncMicrosoftEvents(accountId, cal.id))
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
    console.error("POST /api/sync/microsoft/callback error:", error);

    // Check for authentication errors
    if (error instanceof Error && (
      error.message.includes("invalid_grant") ||
      error.message.includes("invalid_client") ||
      error.message.includes("unauthorized") ||
      error.message.includes("401") ||
      error.message.includes("AADSTS")
    )) {
      return NextResponse.json({
        error: "invalid_credentials",
        message: "Je Microsoft-inloggegevens zijn verlopen. Verwijder het account en voeg het opnieuw toe.",
      }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    );
  }
}
