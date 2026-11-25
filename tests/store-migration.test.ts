import { test } from "node:test";
import assert from "node:assert/strict";

// In-memory localStorage, installed before the store module is loaded.
const mem = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, String(v)),
    removeItem: (k: string) => void mem.delete(k),
  },
});

// A document written by the original app: zustand version 0, a job saved
// before `notes` existed, and a story without tags.
mem.set(
  "greenroom-v1",
  JSON.stringify({
    version: 0,
    state: {
      jobs: [
        {
          id: "job_old",
          company: "Acme",
          role: "Engineer",
          stage: "applied",
          descriptionRaw: "desc",
          analysis: null,
          questions: [],
          interviewDate: null,
          createdAt: "2026-10-01T10:00:00.000Z",
          updatedAt: "2026-10-01T10:00:00.000Z",
        },
      ],
      stories: [],
      sessions: [],
      activityDays: ["2026-10-01"],
    },
  }),
);

const { useGreenroom } = await import("../src/lib/store.ts");

test("the store declares a persisted version", () => {
  assert.equal(useGreenroom.persist.getOptions().version, 1);
});

test("a version-0 document is migrated on load: missing fields get defaults", () => {
  const job = useGreenroom.getState().jobs[0];
  assert.equal(job.id, "job_old");
  assert.deepEqual(job.notes, []);
  assert.deepEqual(useGreenroom.getState().activityDays, ["2026-10-01"]);
});

test("after the next write the stored document is version 1", () => {
  useGreenroom.getState().addNote("job_old", "hello");
  const stored = JSON.parse(mem.get("greenroom-v1") ?? "{}");
  assert.equal(stored.version, 1);
  assert.equal(stored.state.jobs[0].notes[0].text, "hello");
});
