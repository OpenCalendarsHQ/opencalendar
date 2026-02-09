import { NextRequest, NextResponse } from "next/server";
import { verifyToken, generateAccessToken } from "@/lib/auth/jwt";
import { z } from "zod";

const refreshSchema = z.object({
  refreshToken: z.string(),
});

/**
 * POST /api/auth/refresh
 *
 * Exchange a refresh token for a new access token.
 * Desktop app calls this when access token is about to expire.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = refreshSchema.parse(body);

    // Verify refresh token
    const payload = verifyToken(refreshToken, "desktop-refresh");

    // Generate new access token
    const newAccessToken = generateAccessToken(payload.sub, payload.email);

    return NextResponse.json({
      token: newAccessToken,
      userId: payload.sub,
      email: payload.email,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "Token expired") {
      return NextResponse.json(
        { error: "Refresh token expired", code: "TOKEN_EXPIRED" },
        { status: 401 }
      );
    }

    if (error instanceof Error && error.message === "Invalid token") {
      return NextResponse.json(
        { error: "Invalid refresh token", code: "INVALID_TOKEN" },
        { status: 401 }
      );
    }

    console.error("Token refresh error:", error);
    return NextResponse.json(
      { error: "Failed to refresh token" },
      { status: 500 }
    );
  }
}
