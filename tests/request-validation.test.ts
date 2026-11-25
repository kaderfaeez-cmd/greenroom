import { test } from "node:test";
import assert from "node:assert/strict";
import { handleAiPost } from "../src/lib/ai/handler.ts";
import { aiRequest, readJson, sampleAnalysis } from "./helpers.ts";

const noAi = { generate: async () => null };

test("questions with a partial analysis is a 400, not a crash", async () => {
  const res = await handleAiPost(aiRequest({ task: "questions", payload: { analysis: { role: "Engineer" } } }), noAi);
  assert.equal(res.status, 400);
  assert.equal((await readJson(res)).ok, false);
});

test("mock-question with an analysis missing technologies is a 400", async () => {
  const partial: Record<string, unknown> = sampleAnalysis();
  delete partial.technologies;
  const res = await handleAiPost(
    aiRequest({ task: "mock-question", payload: { analysis: partial, category: "technical" } }),
    noAi,
  );
  assert.equal(res.status, 400);
});

test("mock-question with an unknown category is a 400", async () => {
  const res = await handleAiPost(
    aiRequest({ task: "mock-question", payload: { analysis: sampleAnalysis(), category: "astrology" } }),
    noAi,
  );
  assert.equal(res.status, 400);
});

test("a JSON body that is not an object is a 400", async () => {
  const res = await handleAiPost(aiRequest(null, { rawBody: "null" }), noAi);
  assert.equal(res.status, 400);
});

test("an unexpected error becomes a safe 500 JSON error", async () => {
  const boom = {
    generate: async (): Promise<string | null> => {
      throw new Error("secret internal detail");
    },
  };
  const res = await handleAiPost(
    aiRequest({ task: "mock-feedback", payload: { question: "Why us?", answer: "Because." } }),
    boom,
  );
  assert.equal(res.status, 500);
  const body = await readJson(res);
  assert.equal(body.ok, false);
  assert.equal(typeof body.error, "string");
  assert.ok(!String(body.error).includes("secret internal detail"));
});
