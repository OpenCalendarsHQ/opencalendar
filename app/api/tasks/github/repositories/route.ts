import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { taskProviders } from "@/lib/db/schema";
import { getUser } from "@/lib/auth/server";
import { eq, and } from "drizzle-orm";
import { decrypt } from "@/lib/encryption";
import { fetchGitHubRepositories } from "@/lib/sync/github-tasks";

// GET /api/tasks/github/repositories - Fetch available repositories
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get GitHub provider for this user
    const [provider] = await db
      .select()
      .from(taskProviders)
      .where(
        and(
          eq(taskProviders.userId, user.id),
          eq(taskProviders.provider, "github")
        )
      )
      .limit(1);

    if (!provider || !provider.accessToken) {
      return NextResponse.json(
        { error: "GitHub not connected" },
        { status: 404 }
      );
    }

    // Decrypt access token
    const accessToken = decrypt(provider.accessToken);

    // Fetch repositories
    const repositories = await fetchGitHubRepositories(accessToken);

    // Get currently selected repositories
    const selectedRepositories = (provider.providerData?.repositories as string[]) || [];

    return NextResponse.json({
      repositories,
      selected: selectedRepositories,
    });
  } catch (error) {
    console.error("Failed to fetch GitHub repositories:", error);
    return NextResponse.json(
      { error: "Failed to fetch repositories" },
      { status: 500 }
    );
  }
}

// POST /api/tasks/github/repositories - Update selected repositories
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { repositories } = await request.json();

    if (!Array.isArray(repositories)) {
      return NextResponse.json(
        { error: "Invalid repositories format" },
        { status: 400 }
      );
    }

    // Get GitHub provider for this user
    const [provider] = await db
      .select()
      .from(taskProviders)
      .where(
        and(
          eq(taskProviders.userId, user.id),
          eq(taskProviders.provider, "github")
        )
      )
      .limit(1);

    if (!provider) {
      return NextResponse.json(
        { error: "GitHub not connected" },
        { status: 404 }
      );
    }

    // Update provider data with selected repositories
    await db
      .update(taskProviders)
      .set({
        providerData: {
          ...provider.providerData,
          repositories,
        },
        updatedAt: new Date(),
      })
      .where(eq(taskProviders.id, provider.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update GitHub repositories:", error);
    return NextResponse.json(
      { error: "Failed to update repositories" },
      { status: 500 }
    );
  }
}
