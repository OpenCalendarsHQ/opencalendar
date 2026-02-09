/**
 * OAuth State Management
 * Secure state parameter handling to prevent CSRF attacks in OAuth flows
 */

import { randomBytes } from "crypto";

interface OAuthStateData {
  userId: string;
  provider: "google" | "icloud" | "github" | "notion";
  createdAt: number;
}

// In-memory store for OAuth states
// For production with multiple instances, use Redis or signed JWTs
const stateStore = new Map<string, OAuthStateData>();

// Cleanup old states every 5 minutes
setInterval(() => {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  for (const [state, data] of stateStore.entries()) {
    if (data.createdAt < fiveMinutesAgo) {
      stateStore.delete(state);
    }
  }
}, 5 * 60 * 1000);

/**
 * Generate a secure random state token for OAuth flow
 * @param userId - The user initiating the OAuth flow
 * @param provider - The OAuth provider (google, icloud, github, notion)
 * @returns A secure random state token
 */
export function generateOAuthState(
  userId: string,
  provider: "google" | "icloud" | "github" | "notion"
): string {
  // Generate cryptographically secure random state (32 bytes = 256 bits)
  const state = randomBytes(32).toString("base64url");

  // Store state with metadata
  stateStore.set(state, {
    userId,
    provider,
    createdAt: Date.now(),
  });

  return state;
}

/**
 * Validate OAuth state and return associated user data
 * @param state - The state parameter from OAuth callback
 * @param expectedProvider - The expected OAuth provider
 * @returns User ID if valid, null if invalid
 */
export function validateOAuthState(
  state: string,
  expectedProvider: "google" | "icloud" | "github" | "notion"
): string | null {
  const data = stateStore.get(state);

  if (!data) {
    console.error("OAuth state validation failed: State not found");
    return null;
  }

  // Check if state has expired (5 minutes)
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  if (data.createdAt < fiveMinutesAgo) {
    console.error("OAuth state validation failed: State expired");
    stateStore.delete(state);
    return null;
  }

  // Check if provider matches
  if (data.provider !== expectedProvider) {
    console.error(
      `OAuth state validation failed: Provider mismatch (expected ${expectedProvider}, got ${data.provider})`
    );
    return null;
  }

  // State is valid - delete it (one-time use)
  stateStore.delete(state);

  return data.userId;
}
