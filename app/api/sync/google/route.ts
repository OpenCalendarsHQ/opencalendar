import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calendarAccounts, calendars } from "@/lib/db/schema";
import { auth } from "@/lib/auth/server";
import { ensureUserExists } from "@/lib/auth/ensure-user";
import { eq } from "drizzle-orm";
import {
  getAuthorizationUrl,
  exchangeCodeForTokens,
  createOAuth2Client,
  syncGoogleCalendars,
  syncGoogleEvents,
} from "@/lib/sync/google";
import { google } from "googleapis";

// GET /api/sync/google - OAuth redirect or callback
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  // Step 1: Initiate OAuth flow
  if (action === "connect") {
    const { data: session } = await auth.getSession();
    if (!session?.user) {
      return NextResponse.redirect(new URL("/auth/sign-in", request.url));
    }
    await ensureUserExists(session.user);

    const authUrl = getAuthorizationUrl(session.user.id);
    return NextResponse.redirect(authUrl);
  }

  // Step 2: OAuth callback
  if (code && state) {
    try {
      const userId = state;
      // Ensure user exists before inserting account
      await ensureUserExists({ id: userId });
      const tokens = await exchangeCodeForTokens(code);

      // Get user email from Google using properly configured client
      const oauth2Client = createOAuth2Client();
      oauth2Client.setCredentials(tokens);
      const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
      const { data: profile } = await oauth2.userinfo.get();

      // Save the account
      const [newAccount] = await db
        .insert(calendarAccounts)
        .values({
          userId,
          provider: "google",
          email: profile.email || "unknown@gmail.com",
          accessToken: tokens.access_token || null,
          refreshToken: tokens.refresh_token || null,
          tokenExpiresAt: tokens.expiry_date
            ? new Date(tokens.expiry_date)
            : null,
        })
        .returning();

      // Sync calendars + events immediately
      try {
        await syncGoogleCalendars(newAccount.id);
        const cals = await db
          .select()
          .from(calendars)
          .where(eq(calendars.accountId, newAccount.id));
        await Promise.allSettled(
          cals.map((cal) => syncGoogleEvents(newAccount.id, cal.id))
        );
        await db
          .update(calendarAccounts)
          .set({ lastSyncAt: new Date(), updatedAt: new Date() })
          .where(eq(calendarAccounts.id, newAccount.id));
      } catch (syncError) {
        console.error("Initial Google sync failed:", syncError);
      }

      return NextResponse.redirect(
        new URL("/settings/accounts?connected=google", request.url)
      );
    } catch (error) {
      console.error("Google OAuth callback error:", error);
      return NextResponse.redirect(
        new URL("/settings/accounts?error=google_oauth_failed", request.url)
      );
    }
  }

  return NextResponse.json({ error: "Ongeldig verzoek" }, { status: 400 });
}

// POST /api/sync/google - Trigger sync for an account
export async function POST(request: NextRequest) {
  try {
    const { data: session } = await auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");

    if (!accountId) {
      return NextResponse.json(
        { error: "Account ID is verplicht" },
        { status: 400 }
      );
    }

    // Verify account belongs to user
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

    // Sync calendars first
    await syncGoogleCalendars(accountId);

    // Then sync events for all calendars
    const cals = await db
      .select()
      .from(calendars)
      .where(eq(calendars.accountId, accountId));

    const results = await Promise.allSettled(
      cals.map((cal) => syncGoogleEvents(accountId, cal.id))
    );

    // Update last sync time on account
    await db
      .update(calendarAccounts)
      .set({ lastSyncAt: new Date(), updatedAt: new Date() })
      .where(eq(calendarAccounts.id, accountId));

    const errors = results
      .filter((r) => r.status === "rejected")
      .map((r) => (r as PromiseRejectedResult).reason?.message);

    if (errors.length > 0) {
      return NextResponse.json({
        success: true,
        warnings: errors,
        message: `${cals.length - errors.length}/${cals.length} kalenders gesynchroniseerd`,
      });
    }

    return NextResponse.json({
      success: true,
      message: `${cals.length} kalenders gesynchroniseerd`,
    });
  } catch (error) {
    console.error("POST /api/sync/google error:", error);
    return NextResponse.json(
      { error: "Synchronisatie mislukt" },
      { status: 500 }
    );
  }
}
