/**
 * Simple in-memory per-key rate limiter.
 * Production: replace with Redis-based rate limiting (Phase 10+).
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
}

interface RateLimiter {
  check(key: string): RateLimitResult;
  reset(key: string): void;
}

export function createRateLimit(windowMs: number, maxPerKey: number): RateLimiter {
  const store = new Map<string, RateLimitEntry>();

  // Cleanup expired entries every 5 minutes
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    store.forEach((entry, key) => {
      if (entry.resetAt <= now) {
        store.delete(key);
      }
    });
  }, 5 * 60 * 1000);

  // Allow garbage collection if the module is unloaded
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return {
    check(key: string): RateLimitResult {
      const now = Date.now();
      const entry = store.get(key);

      // No entry or window expired — allow and start new window
      if (!entry || entry.resetAt <= now) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, retryAfterMs: 0 };
      }

      // Within window — check count
      if (entry.count >= maxPerKey) {
        return { allowed: false, retryAfterMs: entry.resetAt - now };
      }

      entry.count++;
      return { allowed: true, retryAfterMs: 0 };
    },

    reset(key: string): void {
      store.delete(key);
    },
  };
}

/** OTP send rate limit: 1 per 60 seconds per key */
export const otpSendLimit = createRateLimit(60_000, 1);

/** Password reset request rate limit: 1 per 60 seconds per email */
export const passwordResetLimit = createRateLimit(60_000, 1);

// --- IP-based rate limits for route handlers ---

/** Login: 20 requests per 5 minutes per IP */
export const loginIpLimit = createRateLimit(5 * 60_000, 20);

/** Signup company: 5 requests per 5 minutes per IP */
export const signupIpLimit = createRateLimit(5 * 60_000, 5);

/** Resend validation: 10 requests per 5 minutes per IP */
export const resendValidationIpLimit = createRateLimit(5 * 60_000, 10);

/** Forgot password: 10 requests per 5 minutes per IP */
export const forgotPasswordIpLimit = createRateLimit(5 * 60_000, 10);

/**
 * Extract client IP from request headers.
 * Checks X-Forwarded-For, X-Real-IP, then falls back to "unknown".
 */
export function getClientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    // X-Forwarded-For may contain "client, proxy1, proxy2" — take the first
    return xff.split(",")[0]!.trim();
  }
  return headers.get("x-real-ip") || "unknown";
}
