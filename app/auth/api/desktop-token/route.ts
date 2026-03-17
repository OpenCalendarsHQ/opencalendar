import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateAccessToken, generateRefreshToken } from "@/lib/auth/jwt";
import { ensureUserExists } from "@/lib/auth/ensure-user";

export async function POST(request: NextRequest) {
  try {
    // Verify that user is authenticated via NextAuth
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { id, email, name, image } = session.user;

    await ensureUserExists({
      id,
      email: email || undefined,
      name: name || null,
      image: image || null,
    });

    // Generate JWT tokens
    const accessToken = generateAccessToken(id, email || "");
    const refreshToken = generateRefreshToken(id, email || "");

    return NextResponse.json({
      token: accessToken,
      refreshToken,
      userId: id,
      email,
      name: name || null,
      image: image || null,
    });
  } catch (error) {
    console.error("Desktop token generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate tokens" },
      { status: 500 }
    );
  }
}
