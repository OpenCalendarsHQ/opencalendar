import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyToken } from "./jwt";

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
}

export interface AuthResult {
  user: AuthUser | null;
  source: "jwt" | "session" | null;
}

/**
 * Verify authentication from either JWT Bearer token or Supabase Auth session
 * This allows both web app (session cookies) and desktop app (JWT) to use the same API
 */
export async function verifyRequest(request: NextRequest): Promise<AuthResult> {
  // Check for JWT Bearer token first (desktop app)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    try {
      const payload = verifyToken(token, "desktop-app");
      return {
        user: {
          id: payload.sub,
          email: payload.email,
          name: null,
          image: null,
        },
        source: "jwt",
      };
    } catch (error) {
      console.error("JWT verification failed:", error);
      // Fall through to session check
    }
  }

  // Fallback to Supabase Auth session (web app)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return {
      user: {
        id: user.id,
        email: user.email || "",
        name: user.user_metadata?.name || null,
        image: user.user_metadata?.avatar_url || null,
      },
      source: "session",
    };
  }

  return {
    user: null,
    source: null,
  };
}
