import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAccessToken, generateRefreshToken } from "@/lib/auth/jwt";
import { ensureUserExists } from "@/lib/auth/ensure-user";

/**
 * POST /api/auth/desktop-token
 *
 * Generate JWT tokens for desktop app after successful Supabase Auth login.
 * This endpoint should be called by the web app after OAuth flow completes,
 * then redirect to opencalendar://auth-callback?token=JWT&refresh_token=JWT
 */
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

    // Ensure user exists in our database
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

/**
 * GET /api/auth/desktop-token
 *
 * Web page that handles the OAuth callback and redirects to desktop app with tokens.
 * This is used as the final step in the OAuth flow:
 * 1. User clicks "Login" in desktop app
 * 2. Desktop app opens browser to /auth/desktop-login
 * 3. User completes Neon Auth OAuth flow
 * 4. Browser redirects to this page
 * 5. This page calls POST /api/auth/desktop-token to get JWT
 * 6. This page redirects to opencalendar://auth-callback?token=...
 */
export async function GET() {
  return new NextResponse(
    `
    <!DOCTYPE html>
    <html>
    <head>
      <title>OpenCalendar - Desktop Login</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          background: #fafafa;
        }
        .container {
          background: white;
          padding: 2rem;
          border-radius: 0.5rem;
          border: 1px solid #e5e5e5;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          text-align: center;
          max-width: 400px;
        }
        .spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #e5e5e5;
          border-top: 4px solid #171717;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        h1 {
          margin: 0 0 0.5rem;
          color: #171717;
          font-size: 1.25rem;
          font-weight: 600;
        }
        p {
          color: #737373;
          margin: 0;
          font-size: 0.875rem;
        }
        .error {
          color: #dc2626;
          background: #fee2e2;
          padding: 1rem;
          border-radius: 0.5rem;
          margin-top: 1rem;
          font-size: 0.875rem;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="spinner"></div>
        <h1>Authenticating...</h1>
        <p id="status">Setting up your desktop app</p>
        <div id="error" class="error" style="display: none;"></div>
      </div>
      <script>
        (async () => {
          try {
            // Call POST endpoint to get JWT tokens
            const response = await fetch('/api/auth/desktop-token', {
              method: 'POST',
              credentials: 'include'
            });

            if (!response.ok) {
              throw new Error('Failed to generate tokens');
            }

            const data = await response.json();

            // Redirect to desktop app with tokens
            const redirectUrl = new URL('opencalendar://auth-callback');
            redirectUrl.searchParams.set('token', data.token);
            redirectUrl.searchParams.set('refresh_token', data.refreshToken);
            redirectUrl.searchParams.set('user_id', data.userId);
            redirectUrl.searchParams.set('email', data.email || '');
            if (data.name) redirectUrl.searchParams.set('name', data.name);
            if (data.image) redirectUrl.searchParams.set('image', data.image);

            document.getElementById('status').textContent = 'Redirecting to OpenCalendar...';

            // Try to redirect
            window.location.href = redirectUrl.toString();

            // Show success message after 2 seconds if redirect didn't work
            setTimeout(() => {
              document.getElementById('status').textContent = 'If the app did not open automatically, please close this window and try again.';
            }, 2000);
          } catch (error) {
            console.error('Auth error:', error);
            document.getElementById('status').style.display = 'none';
            document.querySelector('.spinner').style.display = 'none';
            const errorEl = document.getElementById('error');
            errorEl.style.display = 'block';
            errorEl.textContent = 'Authentication failed. Please close this window and try again.';
          }
        })();
      </script>
    </body>
    </html>
    `,
    {
      headers: {
        "Content-Type": "text/html",
      },
    }
  );
}
