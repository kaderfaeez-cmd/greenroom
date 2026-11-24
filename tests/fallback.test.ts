import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeFallback, questionsFallback, scoreFallback } from "../src/lib/ai/fallback.ts";
import { sampleAnalysis, SAMPLE_DESCRIPTION } from "./helpers.ts";

test("analyzeFallback extracts role, company and technologies", () => {
  const a = analyzeFallback(SAMPLE_DESCRIPTION);
  assert.equal(a.company, "Acme");
  assert.match(a.role, /frontend engineer/i);
  assert.ok(a.technologies.includes("typescript"));
  assert.equal(a.seniority, "Senior");
});

test("questionsFallback drops system-design and leadership for junior roles", () => {
  const junior = questionsFallback(sampleAnalysis({ seniority: "Junior / Entry" }));
  const cats = junior.map((q) => q.category);
  assert.ok(!cats.includes("system-design"));
  assert.ok(!cats.includes("leadership"));
});

test("scoreFallback keeps every score within 1..10", () => {
  for (const answer of ["no", "I built and shipped it because users needed it. ".repeat(40)]) {
    const { scores } = scoreFallback(answer);
    for (const v of Object.values(scores)) {
      assert.ok(v >= 1 && v <= 10, `score ${v} out of range`);
    }
  }
});
