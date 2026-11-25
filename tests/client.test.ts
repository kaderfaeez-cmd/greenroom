import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { callAi } from "../src/lib/ai/client.ts";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

function respondWith(res: Response | Error) {
  globalThis.fetch = (async () => {
    if (res instanceof Error) throw res;
    return res;
  }) as typeof fetch;
}

test("a non-JSON server error is reported as a server error, not a network error", async () => {
  respondWith(new Response("<html>Internal Server Error</html>", { status: 500, headers: { "content-type": "text/html" } }));
  const result = await callAi("analyze", {});
  assert.equal(result.ok, false);
  assert.doesNotMatch(result.error ?? "", /network/i);
  assert.match(result.error ?? "", /500/);
});

test("a JSON error body's message is shown to the user", async () => {
  respondWith(Response.json({ ok: false, error: "Too many requests — wait a few minutes" }, { status: 429 }));
  const result = await callAi("analyze", {});
  assert.deepEqual(result, { ok: false, error: "Too many requests — wait a few minutes" });
});

test("a 200 response that is not JSON is an error, not a crash", async () => {
  respondWith(new Response("not json", { status: 200 }));
  const result = await callAi("analyze", {});
  assert.equal(result.ok, false);
  assert.doesNotMatch(result.error ?? "", /network/i);
});

test("a thrown fetch is still reported as a network error", async () => {
  respondWith(new TypeError("Failed to fetch"));
  const result = await callAi("analyze", {});
  assert.equal(result.ok, false);
  assert.match(result.error ?? "", /network/i);
});

test("a successful response is passed through", async () => {
  respondWith(Response.json({ ok: true, engine: "quick", data: 1 }));
  assert.deepEqual(await callAi("analyze", {}), { ok: true, engine: "quick", data: 1 });
});
