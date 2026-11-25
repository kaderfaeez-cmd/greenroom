import { test } from "node:test";
import assert from "node:assert/strict";
import { callGemini } from "../src/lib/ai/gemini.ts";

test("callGemini sends the API key in the x-goog-api-key header, never in the URL", async () => {
  let seenUrl = "";
  let seenHeaders = new Headers();
  const fakeFetch = (async (url: string | URL | Request, init?: RequestInit) => {
    seenUrl = String(url);
    seenHeaders = new Headers(init?.headers);
    return Response.json({ candidates: [{ content: { parts: [{ text: "hi" }] } }] });
  }) as typeof fetch;

  const text = await callGemini("prompt", "secret-key-123", fakeFetch);

  assert.equal(text, "hi");
  assert.ok(!seenUrl.includes("secret-key-123"), `key leaked into URL: ${seenUrl}`);
  assert.equal(seenHeaders.get("x-goog-api-key"), "secret-key-123");
});

test("callGemini does nothing without a key", async () => {
  let called = false;
  const fakeFetch = (async () => {
    called = true;
    return new Response("");
  }) as typeof fetch;
  assert.equal(await callGemini("prompt", undefined, fakeFetch), null);
  assert.equal(called, false);
});
