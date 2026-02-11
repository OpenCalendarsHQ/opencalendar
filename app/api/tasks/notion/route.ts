import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { taskProviders } from "@/lib/db/schema";
import { getUser } from "@/lib/auth/server";
import { ensureUserExists } from "@/lib/auth/ensure-user";
import { generateOAuthState, validateOAuthState } from "@/lib/oauth-state";
import { encrypt } from "@/lib/encryption";
import { syncNotionTasks } from "@/lib/sync/notion";

const NOTION_CLIENT_ID = process.env.NOTION_CLIENT_ID!;
const NOTION_CLIENT_SECRET = process.env.NOTION_CLIENT_SECRET!;
const NOTION_REDIRECT_URI = process.env.NOTION_REDIRECT_URI!;

// GET /api/tasks/notion - OAuth redirect or callback
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Handle OAuth error
  if (error) {
    console.error("Notion OAuth error:", error);
    return NextResponse.redirect(
      new URL(`/settings?tab=tasks?error=${error}`, request.url)
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
    const secureState = generateOAuthState(user.id, "notion");

    // Build Notion OAuth URL
    const authUrl = `https://api.notion.com/v1/oauth/authorize?` +
      `client_id=${encodeURIComponent(NOTION_CLIENT_ID)}&` +
      `response_type=code&` +
      `owner=user&` +
      `redirect_uri=${encodeURIComponent(NOTION_REDIRECT_URI)}&` +
      `state=${encodeURIComponent(secureState)}`;

    return NextResponse.redirect(authUrl);
  }

  // Step 2: OAuth callback
  if (code && state) {
    try {
      // SECURITY: Validate state token to prevent CSRF attacks
      const userId = validateOAuthState(state, "notion");

      if (!userId) {
        console.error("Notion OAuth: Invalid or expired state token");
        return NextResponse.redirect(
          new URL("/settings?tab=tasks?error=oauth_state_invalid", request.url)
        );
      }

      // Ensure user exists before inserting account
      await ensureUserExists({ id: userId });

      // Exchange code for access token
      const tokenResponse = await fetch("https://api.notion.com/v1/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${Buffer.from(`${NOTION_CLIENT_ID}:${NOTION_CLIENT_SECRET}`).toString("base64")}`,
        },
        body: JSON.stringify({
          grant_type: "authorization_code",
          code,
          redirect_uri: NOTION_REDIRECT_URI,
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        console.error("Notion token exchange failed:", errorData);
        return NextResponse.redirect(
          new URL("/settings?tab=tasks?error=notion_token_failed", request.url)
        );
      }

      const tokenData = await tokenResponse.json();
      const { access_token, workspace_id, workspace_name, workspace_icon, bot_id } = tokenData;

      // SECURITY: Encrypt token before storing
      const encryptedAccessToken = encrypt(access_token);

      // Upsert task provider (one Notion account per user)
      const [provider] = await db
        .insert(taskProviders)
        .values({
          userId,
          provider: "notion",
          name: workspace_name || "Notion Workspace",
          accessToken: encryptedAccessToken,
          providerData: {
            workspaceId: workspace_id,
            workspaceName: workspace_name,
            workspaceIcon: workspace_icon,
            botId: bot_id,
          },
        })
        .onConflictDoUpdate({
          target: [taskProviders.userId, taskProviders.provider],
          set: {
            name: workspace_name || "Notion Workspace",
            accessToken: encryptedAccessToken,
            providerData: {
              workspaceId: workspace_id,
              workspaceName: workspace_name,
              workspaceIcon: workspace_icon,
              botId: bot_id,
            },
            isActive: true,
            updatedAt: new Date(),
          },
        })
        .returning();

      // Background sync
      syncNotionTasks(provider.id).catch((err) =>
        console.error("Background sync failed:", err)
      );

      return NextResponse.redirect(
        new URL("/settings?tab=tasks?success=notion_connected", request.url)
      );
    } catch (error) {
      console.error("Notion OAuth callback error:", error);
      return NextResponse.redirect(
        new URL("/settings?tab=tasks?error=notion_callback_failed", request.url)
      );
    }
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}

// POST /api/tasks/notion - Manual sync trigger
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
    await syncNotionTasks(providerId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notion sync error:", error);
    return NextResponse.json(
      { error: "Sync failed" },
      { status: 500 }
    );
  }
}
