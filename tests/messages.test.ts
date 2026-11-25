import { test } from "node:test";
import assert from "node:assert/strict";
import { handleAiPost } from "../src/lib/ai/handler.ts";
import { aiRequest, readJson, testDeps } from "./helpers.ts";

test("STAR drafting failure does not tell the user to add a key in Settings", async () => {
  const res = await handleAiPost(
    aiRequest({
      task: "star-suggest",
      payload: { competency: "Leadership", roughNotes: "I led the migration of our billing system last year." },
    }),
    testDeps(),
  );
  const body = await readJson(res);
  assert.equal(body.ok, false);
  // Settings cannot set a key, and the key may be set but Gemini simply failed.
  assert.doesNotMatch(String(body.error), /settings/i);
  assert.doesNotMatch(String(body.error), /needs a GEMINI_API_KEY/);
});
