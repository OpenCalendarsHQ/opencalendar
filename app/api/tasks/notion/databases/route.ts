import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { taskProviders } from "@/lib/db/schema";
import { getUser } from "@/lib/auth/server";
import { eq, and } from "drizzle-orm";
import { decrypt } from "@/lib/encryption";
import { fetchNotionDatabases } from "@/lib/sync/notion";

// GET /api/tasks/notion/databases - Fetch available databases
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get Notion provider for this user
    const [provider] = await db
      .select()
      .from(taskProviders)
      .where(
        and(
          eq(taskProviders.userId, user.id),
          eq(taskProviders.provider, "notion")
        )
      )
      .limit(1);

    if (!provider || !provider.accessToken) {
      return NextResponse.json(
        { error: "Notion not connected" },
        { status: 404 }
      );
    }

    // Decrypt access token
    const accessToken = decrypt(provider.accessToken);

    // Fetch databases
    const databases = await fetchNotionDatabases(accessToken);

    // Get currently selected database
    const selectedDatabaseId = provider.providerData?.databaseId as string | undefined;

    return NextResponse.json({
      databases,
      selected: selectedDatabaseId,
    });
  } catch (error) {
    console.error("Failed to fetch Notion databases:", error);
    return NextResponse.json(
      { error: "Failed to fetch databases" },
      { status: 500 }
    );
  }
}

// POST /api/tasks/notion/databases - Update selected database
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { databaseId } = await request.json();

    if (!databaseId || typeof databaseId !== "string") {
      return NextResponse.json(
        { error: "Invalid database ID" },
        { status: 400 }
      );
    }

    // Get Notion provider for this user
    const [provider] = await db
      .select()
      .from(taskProviders)
      .where(
        and(
          eq(taskProviders.userId, user.id),
          eq(taskProviders.provider, "notion")
        )
      )
      .limit(1);

    if (!provider) {
      return NextResponse.json(
        { error: "Notion not connected" },
        { status: 404 }
      );
    }

    // Update provider data with selected database
    await db
      .update(taskProviders)
      .set({
        providerData: {
          ...provider.providerData,
          databaseId,
        },
        updatedAt: new Date(),
      })
      .where(eq(taskProviders.id, provider.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update Notion database:", error);
    return NextResponse.json(
      { error: "Failed to update database" },
      { status: 500 }
    );
  }
}
