import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { taskProviders } from "@/lib/db/schema";
import { getUser } from "@/lib/auth/server";
import { ensureUserExists } from "@/lib/auth/ensure-user";
import { generateOAuthState, validateOAuthState } from "@/lib/oauth-state";
import { encrypt } from "@/lib/encryption";
import { syncGitHubIssues } from "@/lib/sync/github-tasks";

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!;
const GITHUB_REDIRECT_URI = process.env.GITHUB_REDIRECT_URI!;

// GET /api/tasks/github - OAuth redirect or callback
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Handle OAuth error
  if (error) {
    console.error("GitHub OAuth error:", error);
    return NextResponse.redirect(
      new URL(`/settings/tasks?error=${error}`, request.url)
    );
  }

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
    const secureState = generateOAuthState(user.id, "github");

    // Build GitHub OAuth URL
    const authUrl = `https://github.com/login/oauth/authorize?` +
      `client_id=${encodeURIComponent(GITHUB_CLIENT_ID)}&` +
      `redirect_uri=${encodeURIComponent(GITHUB_REDIRECT_URI)}&` +
      `state=${encodeURIComponent(secureState)}&` +
      `scope=${encodeURIComponent("repo read:user")}`;

    return NextResponse.redirect(authUrl);
  }

  // Step 2: OAuth callback
  if (code && state) {
    try {
      // SECURITY: Validate state token to prevent CSRF attacks
      const userId = validateOAuthState(state, "github");

      if (!userId) {
        console.error("GitHub OAuth: Invalid or expired state token");
        return NextResponse.redirect(
          new URL("/settings/tasks?error=oauth_state_invalid", request.url)
        );
      }

      // Ensure user exists before inserting account
      await ensureUserExists({ id: userId });

      // Exchange code for access token
      const tokenResponse = await fetch(
        "https://github.com/login/oauth/access_token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify({
            client_id: GITHUB_CLIENT_ID,
            client_secret: GITHUB_CLIENT_SECRET,
            code,
            redirect_uri: GITHUB_REDIRECT_URI,
          }),
        }
      );

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        console.error("GitHub token exchange failed:", errorData);
        return NextResponse.redirect(
          new URL("/settings/tasks?error=github_token_failed", request.url)
        );
      }

      const tokenData = await tokenResponse.json();
      const { access_token, token_type, scope } = tokenData;

      if (!access_token) {
        console.error("GitHub: No access token received");
        return NextResponse.redirect(
          new URL("/settings/tasks?error=github_no_token", request.url)
        );
      }

      // Get user info from GitHub
      const userResponse = await fetch("https://api.github.com/user", {
        headers: {
          "Authorization": `Bearer ${access_token}`,
          "Accept": "application/vnd.github.v3+json",
        },
      });

      if (!userResponse.ok) {
        console.error("Failed to fetch GitHub user info");
        return NextResponse.redirect(
          new URL("/settings/tasks?error=github_user_failed", request.url)
        );
      }

      const githubUser = await userResponse.json();
      const { login: username, avatar_url, name } = githubUser;

      // SECURITY: Encrypt token before storing
      const encryptedAccessToken = encrypt(access_token);

      // Upsert task provider (one GitHub account per user)
      const [provider] = await db
        .insert(taskProviders)
        .values({
          userId,
          provider: "github",
          name: name || username || "GitHub",
          accessToken: encryptedAccessToken,
          providerData: {
            username,
            avatarUrl: avatar_url,
            scope,
          },
        })
        .onConflictDoUpdate({
          target: [taskProviders.userId, taskProviders.provider],
          set: {
            name: name || username || "GitHub",
            accessToken: encryptedAccessToken,
            providerData: {
              username,
              avatarUrl: avatar_url,
              scope,
            },
            isActive: true,
            updatedAt: new Date(),
          },
        })
        .returning();

      // Background sync
      syncGitHubIssues(provider.id).catch((err) =>
        console.error("Background sync failed:", err)
      );

      return NextResponse.redirect(
        new URL("/settings/tasks?success=github_connected", request.url)
      );
    } catch (error) {
      console.error("GitHub OAuth callback error:", error);
      return NextResponse.redirect(
        new URL("/settings/tasks?error=github_callback_failed", request.url)
      );
    }
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}

// POST /api/tasks/github - Manual sync trigger
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { providerId } = await request.json();

    if (!providerId) {
      return NextResponse.json(
        { error: "Provider ID required" },
        { status: 400 }
      );
    }

    // Trigger sync
    await syncGitHubIssues(providerId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("GitHub sync error:", error);
    return NextResponse.json(
      { error: "Sync failed" },
      { status: 500 }
    );
  }
}
