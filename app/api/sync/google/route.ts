import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calendarAccounts, calendars } from "@/lib/db/schema";
import { getUser } from "@/lib/auth/server";
import { ensureUserExists } from "@/lib/auth/ensure-user";
import { eq, and } from "drizzle-orm";
import {
  getAuthorizationUrl,
  exchangeCodeForTokens,
  createOAuth2Client,
  syncGoogleCalendars,
  syncGoogleEvents,
} from "@/lib/sync/google";
import { google } from "googleapis";
import { generateOAuthState, validateOAuthState } from "@/lib/oauth-state";
import { encrypt } from "@/lib/encryption";

// GET /api/sync/google - OAuth redirect or callback
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  // Step 1: Initiate OAuth flow
  if (action === "connect") {
    const user = await getUser();
    if (!user) {
      return NextResponse.redirect(new URL("/auth/sign-in", request.url));
    }
    await ensureUserExists({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.user_metadata?.name,
      image: user.user_metadata?.avatar_url,
    });

    // SECURITY: Generate secure random state token to prevent CSRF attacks
    const secureState = generateOAuthState(user.id, "google");
    const authUrl = getAuthorizationUrl(secureState);
    return NextResponse.redirect(authUrl);
  }

  // Step 2: OAuth callback
  if (code && state) {
    try {
      // SECURITY: Validate state token to prevent CSRF attacks
      const userId = validateOAuthState(state, "google");

      if (!userId) {
        console.error("Google OAuth: Invalid or expired state token");
        return NextResponse.redirect(
          new URL("/settings?error=oauth_state_invalid", request.url)
        );
      }

      // Ensure user exists before inserting account
      await ensureUserExists({ id: userId });
      const tokens = await exchangeCodeForTokens(code);

      // Get user email from Google using properly configured client
      const oauth2Client = createOAuth2Client();
      oauth2Client.setCredentials(tokens);
      const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
      const { data: profile } = await oauth2.userinfo.get();

      const email = profile.email || "unknown@gmail.com";

      // SECURITY: Encrypt tokens before storing in database
      const encryptedAccessToken = tokens.access_token
        ? encrypt(tokens.access_token)
        : null;
      const encryptedRefreshToken = tokens.refresh_token
        ? encrypt(tokens.refresh_token)
        : null;

      // Use upsert to handle both insert and update (one Google account per user)
      const [newAccount] = await db
        .insert(calendarAccounts)
        .values({
          userId,
          provider: "google",
          email,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiresAt: tokens.expiry_date
            ? new Date(tokens.expiry_date)
            : null,
        })
        .onConflictDoUpdate({
          target: [calendarAccounts.userId, calendarAccounts.provider],
          set: {
            email,
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            tokenExpiresAt: tokens.expiry_date
              ? new Date(tokens.expiry_date)
              : null,
            isActive: true,
            updatedAt: new Date(),
          },
        })
        .returning();

      // Sync calendars + events immediately (visible calendars only)
      try {
        await syncGoogleCalendars(newAccount.id);
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
          cals.map((cal) => syncGoogleEvents(newAccount.id, cal.id))
        );
        await db
          .update(calendarAccounts)
          .set({ lastSyncAt: new Date(), updatedAt: new Date() })
          .where(eq(calendarAccounts.id, newAccount.id));
      } catch (syncError) {
        console.error("Initial Google sync failed:", syncError);
      }

      // Check for popup/onboarding return - cookie set when opening OAuth in popup
      const returnTo = request.cookies.get("opencalendar_oauth_return")?.value;
      const redirectUrl = returnTo
        ? new URL(returnTo, request.url)
        : new URL("/settings?connected=google", request.url);
      const response = NextResponse.redirect(redirectUrl);
      response.cookies.delete("opencalendar_oauth_return");
      return response;
    } catch (error) {
      console.error("Google OAuth callback error:", error);
      return NextResponse.redirect(
        new URL("/settings?error=google_oauth_failed", request.url)
      );
    }
  }

  return NextResponse.json({ error: "Ongeldig verzoek" }, { status: 400 });
}

// POST /api/sync/google - Trigger sync for an account
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
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

    if (!account || account.userId !== user.id) {
      return NextResponse.json(
        { error: "Account niet gevonden" },
        { status: 404 }
      );
    }

    // Sync calendars first
    await syncGoogleCalendars(accountId);

    // Then sync events for visible calendars only (skip hidden calendars)
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

    // Check for authentication errors
    if (error instanceof Error && (
      error.message.includes("invalid_grant") ||
      error.message.includes("invalid_client") ||
      error.message.includes("unauthorized") ||
      error.message.includes("401")
    )) {
      return NextResponse.json({
        error: "invalid_credentials",
        message: "Je Google-inloggegevens zijn verlopen. Verwijder het account en voeg het opnieuw toe.",
      }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Synchronisatie mislukt" },
      { status: 500 }
    );
  }
}
