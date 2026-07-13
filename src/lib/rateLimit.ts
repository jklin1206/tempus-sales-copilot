import "server-only";

/**
 * Per-session generation cap (SPEC.md 13).
 *
 * A public demo runs on a free-tier key with a spending limit. This keeps one visitor,
 * or one hot-reload loop, from draining it. It is a fixed-window counter in memory:
 * adequate for a single-instance prototype, and deliberately not sold as production
 * rate limiting.
 */

const WINDOW_MS = 60_000;
// Every provider you open is now a model call: there is no cache to absorb a second visit.
// A reviewer clicking through the territory and back should not trip this.
const MAX_PER_WINDOW = 30;

const windows = new Map<string, { count: number; resetAt: number }>();

function clientKey(request: Request): string {
  // Vercel sets x-forwarded-for. Local requests fall back to a shared bucket, which is
  // fine: the cap is protecting a key, not enforcing fairness between users.
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "local";
}

export function checkRateLimit(request: Request): { allowed: boolean; limit: number; remaining: number } {
  const key = clientKey(request);
  const now = Date.now();
  const existing = windows.get(key);

  if (!existing || now >= existing.resetAt) {
    windows.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, limit: MAX_PER_WINDOW, remaining: MAX_PER_WINDOW - 1 };
  }

  existing.count += 1;

  return {
    allowed: existing.count <= MAX_PER_WINDOW,
    limit: MAX_PER_WINDOW,
    remaining: Math.max(0, MAX_PER_WINDOW - existing.count),
  };
}
