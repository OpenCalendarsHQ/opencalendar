import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userSettings } from "@/lib/db/schema";
import { auth } from "@/lib/auth/server";
import { eq } from "drizzle-orm";

// GET /api/settings - Fetch user settings
export async function GET(request: NextRequest) {
  try {
    const { data: session } = await auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Try to get existing settings
    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, session.user.id));

    if (settings) {
      // Parse JSON fields
      const parsedSettings = {
        ...settings,
        defaultReminders: JSON.parse(settings.defaultReminders),
      };
      return NextResponse.json(parsedSettings);
    }

    // No settings found, return null (client will use defaults)
    return NextResponse.json(null);
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/settings - Update user settings
export async function PUT(request: NextRequest) {
  try {
    const { data: session } = await auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();

    // Stringify JSON fields
    const dataToSave = {
      ...body,
      defaultReminders: JSON.stringify(body.defaultReminders || [15, 60]),
      updatedAt: new Date(),
    };

    // Check if settings exist
    const [existing] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, session.user.id));

    if (existing) {
      // Update existing settings
      const [updated] = await db
        .update(userSettings)
        .set(dataToSave)
        .where(eq(userSettings.userId, session.user.id))
        .returning();

      return NextResponse.json({
        ...updated,
        defaultReminders: JSON.parse(updated.defaultReminders),
      });
    } else {
      // Create new settings
      const [created] = await db
        .insert(userSettings)
        .values({
          userId: session.user.id,
          ...dataToSave,
        })
        .returning();

      return NextResponse.json({
        ...created,
        defaultReminders: JSON.parse(created.defaultReminders),
      });
    }
  } catch (error) {
    console.error("PUT /api/settings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
