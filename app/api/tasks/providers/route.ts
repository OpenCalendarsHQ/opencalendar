import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { taskProviders } from "@/lib/db/schema";
import { getUser } from "@/lib/auth/server";
import { eq, and } from "drizzle-orm";

// GET /api/tasks/providers - Fetch all task providers for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const providers = await db
      .select()
      .from(taskProviders)
      .where(eq(taskProviders.userId, user.id));

    return NextResponse.json({ providers });
  } catch (error) {
    console.error("Failed to fetch providers:", error);
    return NextResponse.json(
      { error: "Failed to fetch providers" },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/providers - Delete a task provider
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get("id");

    if (!providerId) {
      return NextResponse.json(
        { error: "Provider ID required" },
        { status: 400 }
      );
    }

    // Delete provider (cascades to tasks)
    await db
      .delete(taskProviders)
      .where(
        and(eq(taskProviders.id, providerId), eq(taskProviders.userId, user.id))
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete provider:", error);
    return NextResponse.json(
      { error: "Failed to delete provider" },
      { status: 500 }
    );
  }
}
