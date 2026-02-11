import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * CORS middleware for API routes to allow desktop app access
 */
export function corsMiddleware(request: NextRequest, response: NextResponse) {
  // Allow requests from Tauri desktop app origins
  const allowedOrigins = [
    "tauri://localhost",
    "http://localhost:1420", // Tauri dev server
    "https://tauri.localhost", // Alternative Tauri origin
    "https://opencalendars.app", // Production URL
  ];

  const origin = request.headers.get("origin");

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    response.headers.set("Access-Control-Max-Age", "86400"); // 24 hours
  }

  return response;
}

/**
 * Handle preflight OPTIONS requests for CORS
 */
export function handleCorsPreflightRequest(request: NextRequest) {
  const allowedOrigins = [
    "tauri://localhost",
    "http://localhost:1420",
    "https://tauri.localhost",
    "https://opencalendars.app",
  ];

  const origin = request.headers.get("origin");

  if (origin && allowedOrigins.includes(origin)) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  return new NextResponse(null, { status: 204 });
}
