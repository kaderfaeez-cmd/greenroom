import { test } from "node:test";
import assert from "node:assert/strict";
import { DailyCap, RateLimiter, clientKey } from "../src/lib/ai/guard.ts";

test("RateLimiter allows `limit` hits per window, then resets", () => {
  const rl = new RateLimiter(2, 60_000);
  assert.equal(rl.check("a", 0).ok, true);
  assert.equal(rl.check("a", 1).ok, true);
  const blocked = rl.check("a", 2);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.ok === false && blocked.retryAfterSec, 60);
  assert.equal(rl.check("a", 60_001).ok, true);
});

test("RateLimiter memory stays bounded under many distinct clients", () => {
  const rl = new RateLimiter(1, 60_000, 100);
  for (let i = 0; i < 1_000; i++) rl.check(`ip${i}`, 0);
  assert.ok(rl.size <= 100, `size ${rl.size}`);
});

test("DailyCap stops at the cap and resets on the next UTC day", () => {
  const cap = new DailyCap(2);
  const day1 = new Date("2026-11-24T10:00:00Z");
  assert.equal(cap.tryConsume(day1), true);
  assert.equal(cap.tryConsume(day1), true);
  assert.equal(cap.tryConsume(day1), false);
  assert.equal(cap.tryConsume(new Date("2026-11-25T00:00:01Z")), true);
});

test("clientKey uses the first x-forwarded-for address", () => {
  assert.equal(clientKey(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" })), "203.0.113.7");
  assert.equal(clientKey(new Headers()), "unknown");
});
