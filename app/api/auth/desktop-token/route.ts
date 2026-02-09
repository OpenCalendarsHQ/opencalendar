import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { generateAccessToken, generateRefreshToken } from "@/lib/auth/jwt";
import { ensureUserExists } from "@/lib/auth/ensure-user";

/**
 * POST /api/auth/desktop-token
 *
 * Generate JWT tokens for desktop app after successful Neon Auth login.
 * This endpoint should be called by the web app after OAuth flow completes,
 * then redirect to opencalendar://auth-callback?token=JWT&refresh_token=JWT
 */
export async function POST(request: NextRequest) {
  try {
    // Verify that user is authenticated via Neon Auth session
    const { data: session } = await auth.getSession({
      fetchOptions: { headers: request.headers },
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Ensure user exists in our database
    await ensureUserExists(session.user);

    // Generate JWT tokens
    const accessToken = generateAccessToken(
      session.user.id,
      session.user.email || ""
    );
    const refreshToken = generateRefreshToken(
      session.user.id,
      session.user.email || ""
    );

    return NextResponse.json({
      token: accessToken,
      refreshToken,
      userId: session.user.id,
      email: session.user.email,
      name: session.user.name,
      image: session.user.image,
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
          font-family: system-ui, -apple-system, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container {
          background: white;
          padding: 2rem;
          border-radius: 1rem;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          text-align: center;
          max-width: 400px;
        }
        .spinner {
          width: 50px;
          height: 50px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #667eea;
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
          color: #333;
        }
        p {
          color: #666;
          margin: 0;
        }
        .error {
          color: #ef4444;
          background: #fee;
          padding: 1rem;
          border-radius: 0.5rem;
          margin-top: 1rem;
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
