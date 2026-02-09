import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  let next = searchParams.get("next") ?? "/";

  // Decode the next parameter if it's URL encoded
  try {
    next = decodeURIComponent(next);
  } catch {
    next = "/";
  }

  console.log("Auth callback received:", {
    code: code ? `${code.substring(0, 10)}...` : null,
    next,
    origin,
  });

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Auth callback error:", error.message, error.status);
      return NextResponse.redirect(`${origin}/auth/auth-code-error`);
    }

    if (data.session) {
      console.log("Auth callback success, user:", data.user?.email);
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  console.error("Auth callback failed: no code provided");
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
