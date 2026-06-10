

// ─── Role configs (mirrors your original Arcjet setup) ───────────────────────

import { RateLimitConfig, RateLimitResult, RateLimitRole } from "../types";

export const ROLE_CONFIGS: Record<RateLimitRole, { limit: number; message: string }> = {
  admin:   { limit: 20, message: "Admin request limit exceeded (20/min). Slow down!" },
  teacher: { limit: 10, message: "User request limit exceeded (10/min). Please wait." },
  student: { limit: 10, message: "User request limit exceeded (10/min). Please wait." },
  guest:   { limit: 5,  message: "Guest limit exceeded (5/min). Sign up for higher limits." },
};

// ─── In-memory store: key → sorted array of request timestamps ───────────────

const store = new Map<string, number[]>();
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

// Evict stale entries every 5 minutes so the Map doesn't grow unbounded.
// unref() prevents this timer from keeping the process alive on shutdown.
function startCleanup() {
  if (cleanupTimer) return;

  cleanupTimer = setInterval(() => {
    const cutoff = Date.now() - 2 * 60 * 1000; // 2-minute max window
    for (const [key, timestamps] of store.entries()) {
      const fresh = timestamps.filter((t) => t > cutoff);
      fresh.length === 0 ? store.delete(key) : store.set(key, fresh);
    }
  }, 5 * 60 * 1000);

  cleanupTimer.unref?.();
}

// ─── Core sliding-window check ────────────────────────────────────────────────

/**
 * Returns whether the request is within the allowed rate, plus headers metadata.
 *
 * @param key       Unique identifier (e.g. `"${ip}:${role}"`)
 * @param config    { limit, windowMs }
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  startCleanup();

  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Keep only timestamps inside the current sliding window
  const timestamps = store.get(key) ?? [];
  const recent = timestamps.filter((t) => t > windowStart);

  if (recent.length >= config.limit) {
    return {
      allowed: false,
      remaining: 0,
      // Tell the client when the oldest request will roll off the window
      resetAt: recent[0] + config.windowMs,
    };
  }

  recent.push(now);
  store.set(key, recent);

  return {
    allowed: true,
    remaining: config.limit - recent.length,
    resetAt: now + config.windowMs,
  };
}

/** Expose store size for health-check / debug endpoints. */
export function storeSize(): number {
  return store.size;
}
