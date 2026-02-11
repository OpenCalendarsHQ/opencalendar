import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userSettings } from "@/lib/db/schema";
import { verifyRequest } from "@/lib/auth/verify-request";
import { eq } from "drizzle-orm";

// GET /api/settings - Fetch user settings
export async function GET(request: NextRequest) {
  try {
    // Accept both JWT (desktop) and session cookies (web)
    const { user } = await verifyRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Try to get existing settings
    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, user.id));

    if (settings) {
      // Parse JSON fields safely
      let defaultReminders = [15, 60];
      try {
        if (settings.defaultReminders) {
          defaultReminders = JSON.parse(settings.defaultReminders);
        }
      } catch (e) {
        console.error("Failed to parse defaultReminders:", e);
      }

      const parsedSettings = {
        ...settings,
        defaultReminders,
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
    // Accept both JWT (desktop) and session cookies (web)
    const { user } = await verifyRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();

    // Remove timestamp fields and IDs from body (they should not be sent by client)
    const { createdAt, updatedAt, id, userId, ...settingsData } = body;

    // Stringify JSON fields
    const dataToSave = {
      ...settingsData,
      defaultReminders: JSON.stringify(settingsData.defaultReminders || [15, 60]),
      updatedAt: new Date(),
    };

    // Check if settings exist
    const [existing] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, user.id));

    if (existing) {
      // Update existing settings
      const [updated] = await db
        .update(userSettings)
        .set(dataToSave)
        .where(eq(userSettings.userId, user.id))
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
          userId: user.id,
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
