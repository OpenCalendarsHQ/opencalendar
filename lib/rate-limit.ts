/**
 * Simple in-memory rate limiter
 * For production with multiple instances, use Redis-based rate limiting (e.g., upstash/ratelimit)
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 10 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 10 * 60 * 1000);

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the time window
   */
  maxRequests: number;
  /**
   * Time window in seconds
   */
  windowSeconds: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
}

/**
 * Check if a request is rate limited
 * @param identifier - Unique identifier for the rate limit (e.g., user ID, IP address)
 * @param config - Rate limit configuration
 * @returns RateLimitResult with success status and limit info
 */
export function rateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const key = `${identifier}:${Math.floor(now / windowMs)}`;

  let entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    // Create new entry or reset expired entry
    entry = {
      count: 0,
      resetAt: now + windowMs,
    };
    rateLimitStore.set(key, entry);
  }

  entry.count++;

  const remaining = Math.max(0, config.maxRequests - entry.count);
  const success = entry.count <= config.maxRequests;

  return {
    success,
    limit: config.maxRequests,
    remaining,
    resetAt: new Date(entry.resetAt),
  };
}

/**
 * Preset rate limit configurations
 */
export const rateLimitConfigs = {
  // Strict limits for authentication endpoints
  auth: { maxRequests: 5, windowSeconds: 60 }, // 5 requests per minute

  // Moderate limits for mutations (POST, PUT, DELETE)
  mutations: { maxRequests: 30, windowSeconds: 60 }, // 30 requests per minute

  // Generous limits for read operations (GET)
  reads: { maxRequests: 100, windowSeconds: 60 }, // 100 requests per minute

  // Very strict for sync operations (external API calls)
  sync: { maxRequests: 10, windowSeconds: 60 }, // 10 syncs per minute
} as const;
