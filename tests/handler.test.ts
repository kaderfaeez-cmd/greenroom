import { test } from "node:test";
import assert from "node:assert/strict";
import { handleAiPost } from "../src/lib/ai/handler.ts";
import { aiRequest, readJson, sampleAnalysis, SAMPLE_DESCRIPTION } from "./helpers.ts";

const noAi = { generate: async () => null };

test("analyze falls back to the quick engine when the AI is unavailable", async () => {
  const res = await handleAiPost(aiRequest({ task: "analyze", payload: { description: SAMPLE_DESCRIPTION } }), noAi);
  assert.equal(res.status, 200);
  const body = await readJson(res);
  assert.equal(body.ok, true);
  assert.equal(body.engine, "quick");
  const data = body.data as { technologies: string[] };
  assert.ok(data.technologies.includes("react"));
});

test("analyze rejects a description shorter than 40 characters", async () => {
  const res = await handleAiPost(aiRequest({ task: "analyze", payload: { description: "too short" } }), noAi);
  assert.equal(res.status, 400);
  assert.equal((await readJson(res)).ok, false);
});

test("unknown task is a 400", async () => {
  const res = await handleAiPost(aiRequest({ task: "nope", payload: {} }), noAi);
  assert.equal(res.status, 400);
});

test("malformed JSON body is a 400", async () => {
  const res = await handleAiPost(aiRequest(null, { rawBody: "{not json" }), noAi);
  assert.equal(res.status, 400);
});

test("questions fall back to templates for a complete analysis", async () => {
  const res = await handleAiPost(aiRequest({ task: "questions", payload: { analysis: sampleAnalysis() } }), noAi);
  const body = await readJson(res);
  assert.equal(body.engine, "quick");
  assert.ok(Array.isArray(body.data) && (body.data as unknown[]).length >= 10);
});

test("a valid AI analysis is returned with engine ai", async () => {
  const ai = { generate: async () => JSON.stringify(sampleAnalysis({ company: "FromAI" })) };
  const res = await handleAiPost(aiRequest({ task: "analyze", payload: { description: SAMPLE_DESCRIPTION } }), ai);
  const body = await readJson(res);
  assert.equal(body.engine, "ai");
  assert.equal((body.data as { company: string }).company, "FromAI");
});

test("mock-feedback falls back to heuristic scores", async () => {
  const res = await handleAiPost(
    aiRequest({ task: "mock-feedback", payload: { question: "Why us?", answer: "Because I built a thing that 40 users rely on." } }),
    noAi,
  );
  const body = await readJson(res);
  assert.equal(body.engine, "quick");
  const scores = (body.data as { scores: Record<string, number> }).scores;
  for (const v of Object.values(scores)) assert.equal(typeof v, "number");
});
