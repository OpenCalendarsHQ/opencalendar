import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { taskProviders } from "@/lib/db/schema";
import { validateOAuthState } from "@/lib/oauth-state";
import { encrypt } from "@/lib/encryption";
import { syncNotionTasks } from "@/lib/sync/notion";
import { ensureUserExists } from "@/lib/auth/ensure-user";

const NOTION_CLIENT_ID = process.env.NOTION_CLIENT_ID!;
const NOTION_CLIENT_SECRET = process.env.NOTION_CLIENT_SECRET!;
const NOTION_REDIRECT_URI = process.env.NOTION_REDIRECT_URI!;

// GET /api/tasks/notion/callback - OAuth callback handler
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Handle OAuth error
  if (error) {
    console.error("Notion OAuth error:", error);
    return NextResponse.redirect(
      new URL(`/settings?tab=tasks?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  // Validate required parameters
  if (!code || !state) {
    console.error("Notion callback: Missing code or state");
    return NextResponse.redirect(
      new URL("/settings?tab=tasks?error=missing_parameters", request.url)
    );
  }

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
      const errorData = await tokenResponse.json().catch(() => ({ error: "Unknown error" }));
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
