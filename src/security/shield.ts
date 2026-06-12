import type { Request } from "express";
import { ShieldResult } from "../types";


// ─── Pattern sets ─────────────────────────────────────────────────────────────
// Each set is checked independently so we report distinct threat categories.
// IMPORTANT: All patterns use the `i` flag only (no `g`) so `test()` is stateless.

const SQL_INJECTION: RegExp[] = [
  /\b(UNION\s+SELECT|SELECT\s+.+FROM|INSERT\s+INTO|UPDATE\s+.+SET|DELETE\s+FROM|DROP\s+(TABLE|DATABASE)|ALTER\s+TABLE|EXEC(UTE)?|TRUNCATE\s+TABLE)\b/i,
  /(--|#|\/\*|\*\/)/, // comment sequences
  /'\s*(OR|AND)\s+'?\d/i, // classic ' OR 1=1
  /\b(xp_|sp_)\w+/i,      // SQL Server stored procs
  /SLEEP\s*\(\d+\)/i,     // time-based blind
  /BENCHMARK\s*\(\d+/i,
  /LOAD_FILE\s*\(/i,
  /INTO\s+(OUTFILE|DUMPFILE)/i,
];

const XSS: RegExp[] = [
  /<script[\s\S]*?>/i,
  /<[^>]+\son\w+\s*=/i,  // <tag onclick= …>
  /javascript\s*:/i,
  /vbscript\s*:/i,
  /<\s*(iframe|object|embed|applet|meta|link)[^>]*>/i,
  /eval\s*\(/i,
  /expression\s*\(/i,     // IE CSS expression()
  /document\s*\.\s*(cookie|write|location|getElementById)/i,
  /window\s*\.\s*(location|open|eval)/i,
  /&#x[0-9a-f]+;/i,       // hex entity encoding often used to bypass filters
];

const PATH_TRAVERSAL: RegExp[] = [
  /\.\.[/\\]/,            // ../  or ..\
  /\.\.[%2][fF5cC]/,      // URL-encoded versions
  /%2[eE]%2[eE]/,         // %2e%2e
  /\/etc\/passwd/i,
  /\/etc\/shadow/i,
  /\/proc\/self/i,
  /[Cc]:\\\\/,            // Windows absolute paths
];

const COMMAND_INJECTION: RegExp[] = [
  /[;&|`$]\s*(ls|cat|pwd|whoami|id|uname|wget|curl|nc|bash|sh|cmd|powershell)/i,
  /\$\(.*\)/,             // $(command)
  /`.*`/,                 // backtick execution
  /\|\s*\w+/,             // pipe to command
];

// ─── Suspicious request-header names ─────────────────────────────────────────
// Attackers use these for host-header injection and SSRF.

const SUSPICIOUS_HEADER_NAMES = new Set([
  // "x-forwarded-host",
  "x-original-url",
  "x-rewrite-url",
  "x-override-url",
  "x-http-method-override",
  "x-http-method",
  "x-method-override",
]);

const MAX_HEADER_VALUE_LENGTH = 8_192; // 8 KB per header value

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scan(input: string): string[] {
  const found: string[] = [];

  for (const re of SQL_INJECTION) if (re.test(input)) { found.push("SQL Injection"); break; }
  for (const re of XSS)           if (re.test(input)) { found.push("XSS"); break; }
  for (const re of PATH_TRAVERSAL) if (re.test(input)) { found.push("Path Traversal"); break; }
  for (const re of COMMAND_INJECTION) if (re.test(input)) { found.push("Command Injection"); break; }

  return found;
}

function flatten(value: unknown, maxDepth = 4, _depth = 0): string {
  if (_depth > maxDepth) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((v) => flatten(v, maxDepth, _depth + 1)).join(" ");
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .map((v) => flatten(v, maxDepth, _depth + 1))
      .join(" ");
  }
  return "";
}

// ─── Main shield function ─────────────────────────────────────────────────────

export function runShield(req: Request): ShieldResult {
  const threats = new Set<string>();

  // 1. URL
  scan(decodeURIComponent(req.originalUrl ?? req.url)).forEach((t) => threats.add(t));

  // 2. Query parameters
  if (req.query && Object.keys(req.query).length > 0) {
    scan(flatten(req.query)).forEach((t) => threats.add(t));
  }

  // 3. Request body (parsed or raw string)
  if (req.body) {
    const bodyStr = typeof req.body === "string" ? req.body : flatten(req.body);
    scan(bodyStr).forEach((t) => threats.add(t));
  }

  // 4. Headers audit
  for (const [name, value] of Object.entries(req.headers)) {
    const lname = name.toLowerCase();

    if (SUSPICIOUS_HEADER_NAMES.has(lname)) {
      threats.add(`Suspicious header: ${name}`);
    }

    const val = Array.isArray(value) ? value.join("") : (value ?? "");
    if (val.length > MAX_HEADER_VALUE_LENGTH) {
      threats.add(`Oversized header: ${name}`);
    }
  }

  return { passed: threats.size === 0, threats: [...threats] };
}
