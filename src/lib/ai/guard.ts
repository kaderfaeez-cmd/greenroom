/**
 * Abuse controls for POST /api/ai, which spends the owner's Gemini quota.
 *
 * shortcut: the rate limiter and the daily cap are in-memory and per server
 * instance. On Vercel every warm instance keeps its own counters and a cold
 * start resets them, so the effective limit is (limit x live instances). That
 * bounds casual abuse without a paid store; for hard guarantees move the
 * counters to a shared store (e.g. Upstash Redis) and set a quota on the key
 * in Google AI Studio / Cloud Console. See README "Abuse protection".
 */

/** Largest request body accepted, in bytes. Field limits live in schemas.ts. */
export const MAX_BODY_BYTES = 64 * 1024;

/** Per-client limit: requests per window. A mock answer costs 2 requests. */
export const RATE_LIMIT = { limit: 30, windowMs: 10 * 60_000 } as const;

/** Gemini calls per UTC day per instance; past it the quick engine answers. */
export const DAILY_AI_CAP = 500;

/**
 * True when the request comes from a page on this same site. Browsers send
 * Origin and Sec-Fetch-Site on fetch POSTs and scripts on other sites cannot
 * forge them. Non-browser clients can, so this blocks cross-site use of the
 * endpoint and casual curl use, not a determined script; the rate limit and
 * daily cap bound that.
 */
export function isSameOrigin(headers: Headers): boolean {
  const site = headers.get("sec-fetch-site");
  if (site !== null && site !== "same-origin") return false;
  const origin = headers.get("origin");
  if (origin === null) return site === "same-origin";
  const host = headers.get("host");
  try {
    return host !== null && new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Client identity for rate limiting. Vercel overwrites x-forwarded-for, so it can't be spoofed there. */
export function clientKey(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/** Reads the body as text, giving up (null) as soon as it exceeds maxBytes. */
export async function readBodyLimited(req: Request, maxBytes: number): Promise<string | null> {
  const declared = Number(req.headers.get("content-length"));
  if (declared > maxBytes) return null;
  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

export type RateResult = { ok: true } | { ok: false; retryAfterSec: number };

/** Fixed-window counter per key, with a bounded number of tracked keys. */
export class RateLimiter {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly maxKeys: number;

  constructor(limit: number, windowMs: number, maxKeys = 10_000) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.maxKeys = maxKeys;
  }

  get size(): number {
    return this.hits.size;
  }

  check(key: string, now: number = Date.now()): RateResult {
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      this.makeRoom(now);
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
      return { ok: true };
    }
    if (entry.count >= this.limit) {
      return { ok: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
    }
    entry.count += 1;
    return { ok: true };
  }

  private makeRoom(now: number): void {
    if (this.hits.size < this.maxKeys) return;
    for (const [k, v] of this.hits) if (v.resetAt <= now) this.hits.delete(k);
    // Still full: drop the oldest entries (Map keeps insertion order).
    for (const k of this.hits.keys()) {
      if (this.hits.size < this.maxKeys) break;
      this.hits.delete(k);
    }
  }
}

/** Counts AI calls per UTC day. */
export class DailyCap {
  private day = "";
  private used = 0;
  private readonly cap: number;

  constructor(cap: number) {
    this.cap = cap;
  }

  tryConsume(now: Date = new Date()): boolean {
    const day = now.toISOString().slice(0, 10);
    if (day !== this.day) {
      this.day = day;
      this.used = 0;
    }
    if (this.used >= this.cap) return false;
    this.used += 1;
    return true;
  }
}
