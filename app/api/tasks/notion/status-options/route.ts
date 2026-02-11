import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { taskProviders } from "@/lib/db/schema";
import { verifyRequest } from "@/lib/auth/verify-request";
import { eq, and } from "drizzle-orm";
import { decrypt } from "@/lib/encryption";
import { fetchNotionStatusOptions } from "@/lib/sync/notion";

// GET /api/tasks/notion/status-options?providerId=xxx - Fetch status options for a Notion database
export async function GET(request: NextRequest) {
  try {
    const { user } = await verifyRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get("providerId");

    if (!providerId) {
      return NextResponse.json(
        { error: "Provider ID required" },
        { status: 400 }
      );
    }

    // Get Notion provider
    const [provider] = await db
      .select()
      .from(taskProviders)
      .where(
        and(
          eq(taskProviders.id, providerId),
          eq(taskProviders.userId, user.id),
          eq(taskProviders.provider, "notion")
        )
      )
      .limit(1);

    if (!provider || !provider.accessToken) {
      return NextResponse.json(
        { error: "Notion provider not found" },
        { status: 404 }
      );
    }

    const databaseId = provider.providerData?.databaseId as string | undefined;
    if (!databaseId) {
      return NextResponse.json(
        { error: "No database configured for this Notion provider" },
        { status: 400 }
      );
    }

    const accessToken = decrypt(provider.accessToken);
    const options = await fetchNotionStatusOptions(accessToken, databaseId);

    return NextResponse.json({ options });
  } catch (error) {
    console.error("Failed to fetch Notion status options:", error);
    return NextResponse.json(
      { error: "Failed to fetch status options" },
      { status: 500 }
    );
  }
}
