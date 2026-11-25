import { test } from "node:test";
import assert from "node:assert/strict";
import { migrateState } from "../src/lib/persistence.ts";

test("migrateState keeps valid entries and drops only the broken ones", () => {
  const good = { id: "s1", title: "T", competency: "C", createdAt: "x", updatedAt: "x" };
  const out = migrateState(
    { stories: [good, { id: 42 }], jobs: "garbage", activityDays: ["2026-11-01", "bad"] },
    0,
  );
  assert.equal(out.stories.length, 1);
  assert.deepEqual(out.stories[0].tags, []);
  assert.deepEqual(out.jobs, []);
  assert.deepEqual(out.sessions, []);
  assert.deepEqual(out.activityDays, ["2026-11-01"]);
});

test("migrateState tolerates a missing or non-object state", () => {
  assert.deepEqual(migrateState(null, 0), { jobs: [], stories: [], sessions: [], activityDays: [] });
});
