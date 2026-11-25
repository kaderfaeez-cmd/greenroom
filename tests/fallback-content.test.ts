import { test } from "node:test";
import assert from "node:assert/strict";
import { questionsFallback } from "../src/lib/ai/fallback.ts";
import { sampleAnalysis } from "./helpers.ts";

const examples = questionsFallback(sampleAnalysis()).map((q) => q.strongAnswerExample);

test("example answers contain no unfilled currency placeholder", () => {
  for (const text of examples) assert.doesNotMatch(text, /R\s*[–-]\s*R/);
});

test("example answers contain no facts from the developer's own projects", () => {
  const personal = /140\+|\b148\b|recipe platform|prediction platform|tournament|QR flow|small clinics/i;
  for (const text of examples) assert.doesNotMatch(text, personal, text);
});

test("the salary example tells the user what to fill in", () => {
  const salary = questionsFallback(sampleAnalysis()).find((q) => /salary/i.test(q.question));
  assert.ok(salary);
  assert.match(salary.strongAnswerExample, /\[[^\]]+\]/);
});
