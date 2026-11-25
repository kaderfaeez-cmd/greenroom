import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBackup } from "../src/lib/backup.ts";

const validJob = {
  id: "job_1",
  company: "Acme",
  role: "Engineer",
  stage: "applied",
  descriptionRaw: "A long enough job description for testing purposes only.",
  analysis: null,
  questions: [],
  notes: [],
  interviewDate: null,
  createdAt: "2026-11-01T10:00:00.000Z",
  updatedAt: "2026-11-01T10:00:00.000Z",
};

const backup = (state: unknown, version?: number) =>
  JSON.stringify(version === undefined ? { state } : { state, version });

test("a backup whose collections have the wrong shape is rejected", () => {
  const result = parseBackup(backup({ jobs: "nope", stories: [], sessions: [], activityDays: [] }, 1));
  assert.equal(result.ok, false);
});

test("a backup with a malformed job is rejected instead of crashing every page", () => {
  const result = parseBackup(backup({ jobs: [{ id: "x", stage: "not-a-stage" }], stories: [], sessions: [], activityDays: [] }, 1));
  assert.equal(result.ok, false);
});

test("non-JSON and non-backup files are rejected", () => {
  assert.equal(parseBackup("hello").ok, false);
  assert.equal(parseBackup(JSON.stringify({ foo: 1 })).ok, false);
});

test("a valid backup is accepted and normalised to the current version", () => {
  const result = parseBackup(backup({ jobs: [validJob], stories: [], sessions: [], activityDays: ["2026-11-01"] }, 1));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const stored = JSON.parse(result.text);
  assert.equal(stored.version, 1);
  assert.equal(stored.state.jobs[0].id, "job_1");
});

test("an old (version 0) backup is migrated on import", () => {
  const { notes: _n, ...oldJob } = validJob;
  void _n;
  const result = parseBackup(backup({ jobs: [oldJob], stories: [], sessions: [], activityDays: [] }));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const stored = JSON.parse(result.text);
  assert.equal(stored.version, 1);
  assert.deepEqual(stored.state.jobs[0].notes, []);
});
