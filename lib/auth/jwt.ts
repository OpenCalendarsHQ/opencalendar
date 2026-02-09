import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRY = parseInt(process.env.JWT_EXPIRY || "2592000"); // 30 dagen
const JWT_REFRESH_EXPIRY = parseInt(process.env.JWT_REFRESH_EXPIRY || "7776000"); // 90 dagen

export interface JWTPayload {
  sub: string; // user ID
  email: string;
  iat: number;
  exp: number;
  aud: "desktop-app" | "desktop-refresh";
  iss: "opencalendar-api";
}

/**
 * Generate an access JWT token for desktop app
 */
export function generateAccessToken(userId: string, email: string): string {
  const payload: Omit<JWTPayload, "iat" | "exp"> = {
    sub: userId,
    email,
    aud: "desktop-app",
    iss: "opencalendar-api",
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
  });
}

/**
 * Generate a refresh token for desktop app
 */
export function generateRefreshToken(userId: string, email: string): string {
  const payload: Omit<JWTPayload, "iat" | "exp"> = {
    sub: userId,
    email,
    aud: "desktop-refresh",
    iss: "opencalendar-api",
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRY,
  });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string, audience: "desktop-app" | "desktop-refresh"): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      audience,
      issuer: "opencalendar-api",
    }) as JWTPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error("Token expired");
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error("Invalid token");
    }
    throw error;
  }
}

/**
 * Check if a token is about to expire (within 5 minutes)
 */
export function isTokenExpiringSoon(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as JWTPayload | null;
    if (!decoded || !decoded.exp) return true;

    const expiryTime = decoded.exp * 1000; // Convert to milliseconds
    const fiveMinutes = 5 * 60 * 1000;

    return Date.now() + fiveMinutes >= expiryTime;
  } catch {
    return true;
  }
}
