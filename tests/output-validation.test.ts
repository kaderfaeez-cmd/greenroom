import { test } from "node:test";
import assert from "node:assert/strict";
import { handleAiPost } from "../src/lib/ai/handler.ts";
import { aiRequest, readJson, sampleAnalysis, SAMPLE_DESCRIPTION } from "./helpers.ts";

const ai = (text: string) => ({ generate: async () => text });

test("an AI analysis missing fields falls back to the quick engine", async () => {
  const res = await handleAiPost(
    aiRequest({ task: "analyze", payload: { description: SAMPLE_DESCRIPTION } }),
    ai(JSON.stringify({ requiredSkills: ["React"] })),
  );
  const body = await readJson(res);
  assert.equal(body.engine, "quick");
  assert.ok(Array.isArray((body.data as { technologies: unknown }).technologies));
});

test("AI questions with missing fields fall back to templates", async () => {
  const res = await handleAiPost(
    aiRequest({ task: "questions", payload: { analysis: sampleAnalysis() } }),
    ai(JSON.stringify([{ question: "Why?" }])),
  );
  assert.equal((await readJson(res)).engine, "quick");
});

test("AI feedback with non-numeric scores falls back to heuristic scores", async () => {
  const res = await handleAiPost(
    aiRequest({ task: "mock-feedback", payload: { question: "Why us?", answer: "Because I shipped it." } }),
    ai(
      JSON.stringify({
        scores: { structure: "8", clarity: 7, depth: 7, confidence: 7, overall: 7.3 },
        feedback: "Good",
      }),
    ),
  );
  const body = await readJson(res);
  assert.equal(body.engine, "quick");
  const scores = (body.data as { scores: Record<string, unknown> }).scores;
  for (const v of Object.values(scores)) assert.equal(typeof v, "number");
});

test("an AI STAR draft without tags is rejected, not passed to the UI", async () => {
  const res = await handleAiPost(
    aiRequest({
      task: "star-suggest",
      payload: { competency: "Leadership", roughNotes: "I led the migration of our billing system last year." },
    }),
    ai(JSON.stringify({ title: "Billing", situation: "Old system" })),
  );
  const body = await readJson(res);
  assert.equal(body.ok, false);
});

test("a complete AI STAR draft is accepted", async () => {
  const draft = { title: "Billing", situation: "S", task: "T", action: "A", result: "R", tags: ["leadership"] };
  const res = await handleAiPost(
    aiRequest({
      task: "star-suggest",
      payload: { competency: "Leadership", roughNotes: "I led the migration of our billing system last year." },
    }),
    ai(JSON.stringify(draft)),
  );
  const body = await readJson(res);
  assert.equal(body.ok, true);
  assert.deepEqual(body.data, draft);
});
