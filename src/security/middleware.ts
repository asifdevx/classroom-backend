import type { NextFunction, Request, Response } from "express";

import { RateLimitRole } from "../types";
import { detectBot } from "./botDetector.js";
import { checkRateLimit, ROLE_CONFIGS } from "./rateLimiter.js";
import { runShield } from "./shield.js";


const WINDOW_MS = 60 * 1_000; // 1-minute sliding window

// ─── IP extraction ────────────────────────────────────────────────────────────
// For production behind a trusted proxy (nginx, AWS ALB, Heroku, etc.) set:
//   app.set("trust proxy", 1);
// Express will then populate req.ip correctly from X-Forwarded-For.
// This helper only falls back to the socket address when req.ip is unavailable.

function getClientIp(req: Request): string {
  return req.ip ?? req.socket?.remoteAddress ?? "0.0.0.0";
}

// ─── Middleware ───────────────────────────────────────────────────────────────

const securityMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Skip all checks in test environment
  if (process.env.NODE_ENV === "test") {
    next();
    return;
  }

  try {
    const ip = getClientIp(req);
     

    // ── 1. Bot detection ────────────────────────────────────────────────────
    const bot = detectBot(req.headers["user-agent"]);

    if (bot.isBot && !bot.isAllowed) {
      res.status(403).json({
        error: "Forbidden",
        message: "Automated requests are not allowed",
      });
      return;
    }

    // ── 2. Shield (attack-pattern scanning) ────────────────────────────────
    const shield = runShield(req);

    if (!shield.passed) {
      // Log internally but never expose which pattern matched — avoids helping
      // an attacker tune their payload.
      console.warn(
        `[Shield] Blocked ${req.method} ${req.originalUrl} from ${ip} — ${shield.threats.join(", ")}`
      );
      res.status(403).json({
        error: "Forbidden",
        message: "Request blocked by security policy",
      });
      return;
    }

    // ── 3. Role-based sliding-window rate limit ─────────────────────────────
    // req.user is populated by your auth middleware upstream.
    const role: RateLimitRole = (req as Request & { user?: { role?: RateLimitRole } })
      .user?.role ?? "guest";

    const roleConfig = ROLE_CONFIGS[role];

    // Key includes both IP and role so a single IP can't exhaust another role's
    // quota, and different users on the same NAT are tracked separately by role.
    const rateLimitKey = `${ip}:${role}`;
    const rl = checkRateLimit(rateLimitKey, {
      limit: roleConfig.limit,
      windowMs: WINDOW_MS,
    });

    // Standard rate-limit headers (RFC 6585 / draft-ietf-httpapi-ratelimit-headers)
    res.setHeader("X-RateLimit-Limit", roleConfig.limit);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, rl.remaining));
    res.setHeader("X-RateLimit-Reset", Math.ceil(rl.resetAt / 1_000));

    if (!rl.allowed) {
      const retryAfterSec = Math.ceil((rl.resetAt - Date.now()) / 1_000);
      res.setHeader("Retry-After", retryAfterSec);
      res.status(429).json({
        error: "Too Many Requests",
        message: roleConfig.message,
      });
      return;
    }

    next();
  } catch (error) {
    console.error("[Security] Middleware error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Something went wrong with the security middleware.",
    });
  }
};

export default securityMiddleware;
