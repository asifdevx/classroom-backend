

// ─── Whitelisted bots ─────────────────────────────────────────────────────────
// These are allowed through (search engines, social-preview crawlers, etc.)

import { BotDetectionResult } from "../types";


const ALLOWED_BOTS: RegExp[] = [
  /googlebot/i,
  /google-inspectiontool/i,
  /bingbot/i,
  /slurp/i,           // Yahoo Search
  /duckduckbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /applebot/i,
  /facebookexternalhit/i,
  /facebot/i,
  /twitterbot/i,
  /linkedinbot/i,
  /slackbot/i,
  /slack-imgproxy/i,
  /discordbot/i,
  /whatsapp/i,
  /telegrambot/i,
  /iframely/i,        // Generic link-preview service
];

// ─── Definitively blocked automation tools ────────────────────────────────────

const BLOCKED_TOOLS: RegExp[] = [
  /python-requests/i,
  /go-http-client/i,
  /java\//i,
  /libwww-perl/i,
  /lwp-trivial/i,
  /curl\//i,
  /wget\//i,
  /scrapy/i,
  /httpx/i,
  /node-fetch/i,
  /got\//i,
  /axios\/\d/i,       // "axios/1.x" — versioned is automation; bare "axios" caught below
  /okhttp/i,
  /httpclient/i,
  /headlesschrome/i,
  /phantomjs/i,
  /selenium/i,
  /webdriver/i,
  /puppeteer/i,
  /playwright/i,
  /cypress\/\d/i,
  /htmlunit/i,
  /mechanize/i,
];

// ─── Generic suspicious patterns (medium confidence) ─────────────────────────

const SUSPICIOUS: RegExp[] = [
  /\bbot\b/i,
  /\bcrawler\b/i,
  /\bspider\b/i,
  /\bscraper\b/i,
  /\bfetcher\b/i,
  /\bharvester\b/i,
  /\bchecker\b/i,
  /\bmonitoring\b/i,
  /\bscanner\b/i,
];

// ─── Main detector ────────────────────────────────────────────────────────────

export function detectBot(userAgent: string | undefined): BotDetectionResult {
  if (!userAgent || userAgent.trim() === "") {
    return {
      isBot: true,
      isAllowed: false,
      confidence: "high",
      reason: "Missing User-Agent header",
    };
  }

  for (const pattern of ALLOWED_BOTS) {
    if (pattern.test(userAgent)) {
      return { isBot: true, isAllowed: true, confidence: "high", reason: "Whitelisted bot" };
    }
  }

  for (const pattern of BLOCKED_TOOLS) {
    if (pattern.test(userAgent)) {
      return {
        isBot: true,
        isAllowed: false,
        confidence: "high",
        reason: `Blocked automation tool matched: ${pattern.source}`,
      };
    }
  }

  for (const pattern of SUSPICIOUS) {
    if (pattern.test(userAgent)) {
      return {
        isBot: true,
        isAllowed: false,
        confidence: "medium",
        reason: "Suspicious User-Agent pattern",
      };
    }
  }

  return { isBot: false, isAllowed: true, confidence: "low" };
}
