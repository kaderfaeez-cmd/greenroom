import { test } from "node:test";
import assert from "node:assert/strict";
import { handleAiPost } from "../src/lib/ai/handler.ts";
import { aiRequest, readJson, SAMPLE_DESCRIPTION, testDeps } from "./helpers.ts";

const analyzeBody = { task: "analyze", payload: { description: SAMPLE_DESCRIPTION } };

test("a cross-site browser request is refused with 403", async () => {
  const req = aiRequest(analyzeBody, {
    headers: { origin: "https://evil.example", "sec-fetch-site": "cross-site" },
  });
  const res = await handleAiPost(req, testDeps());
  assert.equal(res.status, 403);
  assert.equal((await readJson(res)).ok, false);
});

test("a request with a foreign Origin but no Sec-Fetch-Site is refused", async () => {
  const req = aiRequest(analyzeBody, { headers: { origin: "https://evil.example" } });
  const headers = new Headers(req.headers);
  headers.delete("sec-fetch-site");
  const res = await handleAiPost(new Request(req, { headers }), testDeps());
  assert.equal(res.status, 403);
});

test("a request with no Origin and no Sec-Fetch-Site (e.g. curl) is refused", async () => {
  const req = aiRequest(analyzeBody);
  const headers = new Headers(req.headers);
  headers.delete("origin");
  headers.delete("sec-fetch-site");
  const res = await handleAiPost(new Request(req, { headers }), testDeps());
  assert.equal(res.status, 403);
});

test("an oversized body is refused with 413 before it is parsed", async () => {
  const huge = JSON.stringify({ task: "analyze", payload: { description: "x".repeat(200_000) } });
  const res = await handleAiPost(aiRequest(null, { rawBody: huge }), testDeps());
  assert.equal(res.status, 413);
});

test("a field over its length limit is a 400", async () => {
  const res = await handleAiPost(
    aiRequest({ task: "mock-feedback", payload: { question: "Why?", answer: "a".repeat(6_001) } }),
    testDeps(),
  );
  assert.equal(res.status, 400);
});

test("a burst from one client is rate limited with 429 and Retry-After", async () => {
  const deps = testDeps({ limit: 3 });
  const send = () =>
    handleAiPost(aiRequest(analyzeBody, { headers: { "x-forwarded-for": "203.0.113.7" } }), deps);
  for (let i = 0; i < 3; i++) assert.equal((await send()).status, 200);
  const limited = await send();
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get("retry-after")) > 0);

  // Another client is unaffected.
  const other = await handleAiPost(
    aiRequest(analyzeBody, { headers: { "x-forwarded-for": "198.51.100.1" } }),
    deps,
  );
  assert.equal(other.status, 200);
});
