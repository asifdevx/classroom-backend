export type RateLimitRole = "admin" | "teacher" | "student" | "guest";

export interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix timestamp in ms
}

export interface BotDetectionResult {
  isBot: boolean;
  isAllowed: boolean; // true for whitelisted bots (Googlebot, Slack preview, etc.)
  confidence: "high" | "medium" | "low";
  reason?: string;
}

export interface ShieldResult {
  passed: boolean;
  threats: string[];
}
