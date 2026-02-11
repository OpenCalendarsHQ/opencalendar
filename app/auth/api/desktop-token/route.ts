import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAccessToken, generateRefreshToken } from "@/lib/auth/jwt";
import { ensureUserExists } from "@/lib/auth/ensure-user";
export async function POST(request: NextRequest) {
  try {
    // Verify that user is authenticated via Supabase Auth session
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    await ensureUserExists({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || null,
      image: user.user_metadata?.avatar_url || null,
    });

    // Generate JWT tokens
    const accessToken = generateAccessToken(user.id, user.email || "");
    const refreshToken = generateRefreshToken(user.id, user.email || "");

    return NextResponse.json({
      token: accessToken,
      refreshToken,
      userId: user.id,
      email: user.email,
      name: user.user_metadata?.name || null,
      image: user.user_metadata?.avatar_url || null,
    });
  } catch (error) {
    console.error("Desktop token generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate tokens" },
      { status: 500 }
    );
  }
}
