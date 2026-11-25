import { test } from "node:test";
import assert from "node:assert/strict";

const mem = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, String(v)),
    removeItem: (k: string) => void mem.delete(k),
  },
});

const scores = { structure: 6, clarity: 8, depth: 6, confidence: 8, overall: 7 };
const turn = (role: string, at: string, extra: object = {}) => ({ id: `t_${at}`, role, content: "x", at, ...extra });

// Saved by a tab that was closed mid-interview: two sessions never ended.
mem.set(
  "greenroom-v1",
  JSON.stringify({
    version: 1,
    state: {
      jobs: [],
      stories: [],
      activityDays: [],
      sessions: [
        // Opening question failed / left immediately: no answers.
        { id: "empty", jobId: "j", category: "technical", turns: [turn("interviewer", "2026-11-01T10:00:00.000Z")], startedAt: "2026-11-01T10:00:00.000Z", endedAt: null, averageScore: null },
        // Answered once, then the tab was closed.
        {
          id: "answered",
          jobId: "j",
          category: "technical",
          turns: [
            turn("interviewer", "2026-11-02T10:00:00.000Z"),
            turn("candidate", "2026-11-02T10:01:00.000Z"),
            turn("feedback", "2026-11-02T10:02:00.000Z", { scores }),
          ],
          startedAt: "2026-11-02T10:00:00.000Z",
          endedAt: null,
          averageScore: null,
        },
      ],
    },
  }),
);

const { useGreenroom } = await import("../src/lib/store.ts");

test("on load, an interrupted session with no answers is removed", () => {
  const ids = useGreenroom.getState().sessions.map((s) => s.id);
  assert.ok(!ids.includes("empty"), `still present: ${ids.join(",")}`);
});

test("on load, an interrupted session with answers is ended and scored", () => {
  const s = useGreenroom.getState().sessions.find((x) => x.id === "answered");
  assert.ok(s);
  assert.equal(s.endedAt, "2026-11-02T10:02:00.000Z");
  assert.equal(s.averageScore, 7);
});

test("discardSession removes a session", () => {
  const { startSession, discardSession } = useGreenroom.getState();
  const s = startSession("j", "recruiter");
  discardSession(s.id);
  assert.ok(!useGreenroom.getState().sessions.some((x) => x.id === s.id));
});
