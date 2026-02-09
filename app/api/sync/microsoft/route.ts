import { NextRequest, NextResponse } from "next/server";

const MICROSOFT_AUTH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";

// GET /api/sync/microsoft - Redirect to Microsoft OAuth
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get("action");

  if (action === "connect") {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const redirectUri = process.env.MICROSOFT_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      return NextResponse.json(
        { error: "Microsoft OAuth niet geconfigureerd" },
        { status: 500 }
      );
    }

    const scopes = [
      "offline_access",
      "Calendars.ReadWrite",
      "Calendars.ReadWrite.Shared",
      "User.Read",
    ];

    const authUrl = new URL(MICROSOFT_AUTH_URL);
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", scopes.join(" "));
    authUrl.searchParams.set("response_mode", "query");

    return NextResponse.redirect(authUrl.toString());
  }

  return NextResponse.json(
    { error: "Ongeldig verzoek. Gebruik action: 'connect'" },
    { status: 400 }
  );
}
