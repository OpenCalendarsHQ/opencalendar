import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { corsMiddleware, handleCorsPreflightRequest } from "./middleware-cors";
import createMiddleware from 'next-intl/middleware';

const intlMiddleware = createMiddleware({
  locales: ['en', 'nl'],
  defaultLocale: 'nl',
  localePrefix: 'never'
});

export async function middleware(request: NextRequest) {
  // 1. Handle CORS preflight requests for API routes
  if (request.method === "OPTIONS" && request.nextUrl.pathname.startsWith("/api/")) {
    return handleCorsPreflightRequest(request);
  }

  // 2. Handle internationalization
  const response = intlMiddleware(request);

  // 3. Update supabase session
  // Note: updateSession will create its own response if it needs to redirect,
  // but we want to preserve any locale cookies set by intlMiddleware.
  const sessionResponse = await updateSession(request);

  // 4. Add CORS headers to API responses for desktop app
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return corsMiddleware(request, sessionResponse);
  }

  return sessionResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
