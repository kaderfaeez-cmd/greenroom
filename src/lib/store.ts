"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  InterviewQuestion,
  Job,
  JobAnalysis,
  JobNote,
  MockSession,
  MockTurn,
  Stage,
  StarStory,
} from "@/lib/types";
import { nowIso, uid } from "@/lib/utils";

interface GreenroomState {
  jobs: Job[];
  stories: StarStory[];
  sessions: MockSession[];
  /** Practice activity log: ISO date strings (yyyy-mm-dd) with any activity. */
  activityDays: string[];

  addJob: (input: { company: string; role: string; descriptionRaw: string }) => Job;
  updateJob: (id: string, patch: Partial<Omit<Job, "id" | "createdAt">>) => void;
  deleteJob: (id: string) => void;
  moveJobStage: (id: string, stage: Stage) => void;
  setAnalysis: (jobId: string, analysis: JobAnalysis) => void;
  setQuestions: (jobId: string, questions: InterviewQuestion[]) => void;
  togglePracticed: (jobId: string, questionId: string) => void;
  addNote: (jobId: string, text: string) => void;
  deleteNote: (jobId: string, noteId: string) => void;

  addStory: (story: Omit<StarStory, "id" | "createdAt" | "updatedAt">) => StarStory;
  updateStory: (id: string, patch: Partial<Omit<StarStory, "id" | "createdAt">>) => void;
  deleteStory: (id: string) => void;

  startSession: (jobId: string, category: MockSession["category"]) => MockSession;
  appendTurn: (sessionId: string, turn: Omit<MockTurn, "id" | "at">) => void;
  endSession: (sessionId: string) => void;

  recordActivity: () => void;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export const useGreenroom = create<GreenroomState>()(
  persist(
    (set, get) => ({
      jobs: [],
      stories: [],
      sessions: [],
      activityDays: [],

      addJob: (input) => {
        const job: Job = {
          id: uid("job_"),
          company: input.company,
          role: input.role,
          stage: "wishlist",
          descriptionRaw: input.descriptionRaw,
          analysis: null,
          questions: [],
          notes: [],
          interviewDate: null,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        set((s) => ({ jobs: [job, ...s.jobs] }));
        get().recordActivity();
        return job;
      },

      updateJob: (id, patch) =>
        set((s) => ({
          jobs: s.jobs.map((j) =>
            j.id === id ? { ...j, ...patch, updatedAt: nowIso() } : j,
          ),
        })),

      deleteJob: (id) =>
        set((s) => ({
          jobs: s.jobs.filter((j) => j.id !== id),
          sessions: s.sessions.filter((x) => x.jobId !== id),
        })),

      moveJobStage: (id, stage) => get().updateJob(id, { stage }),

      setAnalysis: (jobId, analysis) =>
        set((s) => ({
          jobs: s.jobs.map((j) =>
            j.id === jobId
              ? {
                  ...j,
                  analysis,
                  company: analysis.company !== "Unknown company" ? analysis.company : j.company,
                  role: analysis.role !== "Unknown role" ? analysis.role : j.role,
                  updatedAt: nowIso(),
                }
              : j,
          ),
        })),

      setQuestions: (jobId, questions) => get().updateJob(jobId, { questions }),

      togglePracticed: (jobId, questionId) =>
        set((s) => ({
          jobs: s.jobs.map((j) =>
            j.id === jobId
              ? {
                  ...j,
                  questions: j.questions.map((q) =>
                    q.id === questionId ? { ...q, practiced: !q.practiced } : q,
                  ),
                  updatedAt: nowIso(),
                }
              : j,
          ),
        })),

      addNote: (jobId, text) =>
        set((s) => ({
          jobs: s.jobs.map((j) =>
            j.id === jobId
              ? {
                  ...j,
                  notes: [
                    { id: uid("n_"), text, createdAt: nowIso() } satisfies JobNote,
                    ...j.notes,
                  ],
                  updatedAt: nowIso(),
                }
              : j,
          ),
        })),

      deleteNote: (jobId, noteId) =>
        set((s) => ({
          jobs: s.jobs.map((j) =>
            j.id === jobId
              ? { ...j, notes: j.notes.filter((n) => n.id !== noteId), updatedAt: nowIso() }
              : j,
          ),
        })),

      addStory: (input) => {
        const story: StarStory = {
          ...input,
          id: uid("story_"),
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        set((s) => ({ stories: [story, ...s.stories] }));
        get().recordActivity();
        return story;
      },

      updateStory: (id, patch) =>
        set((s) => ({
          stories: s.stories.map((x) =>
            x.id === id ? { ...x, ...patch, updatedAt: nowIso() } : x,
          ),
        })),

      deleteStory: (id) =>
        set((s) => ({ stories: s.stories.filter((x) => x.id !== id) })),

      startSession: (jobId, category) => {
        const session: MockSession = {
          id: uid("mock_"),
          jobId,
          category,
          turns: [],
          startedAt: nowIso(),
          endedAt: null,
          averageScore: null,
        };
        set((s) => ({ sessions: [session, ...s.sessions] }));
        get().recordActivity();
        return session;
      },

      appendTurn: (sessionId, turn) =>
        set((s) => ({
          sessions: s.sessions.map((x) =>
            x.id === sessionId
              ? { ...x, turns: [...x.turns, { ...turn, id: uid("t_"), at: nowIso() }] }
              : x,
          ),
        })),

      endSession: (sessionId) =>
        set((s) => ({
          sessions: s.sessions.map((x) => {
            if (x.id !== sessionId) return x;
            const scores = x.turns
              .filter((t) => t.role === "feedback" && t.scores)
              .map((t) => t.scores!.overall);
            const averageScore =
              scores.length > 0
                ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
                : null;
            return { ...x, endedAt: nowIso(), averageScore };
          }),
        })),

      recordActivity: () =>
        set((s) =>
          s.activityDays.includes(todayKey())
            ? s
            : { activityDays: [...s.activityDays, todayKey()] },
        ),
    }),
    {
      name: "greenroom-v1",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/** Consecutive-day practice streak ending today or yesterday. */
export function computeStreak(activityDays: string[]): number {
  const days = new Set(activityDays);
  const cursor = new Date();
  let streak = 0;
  // Allow streak to survive if today has no activity yet.
  if (!days.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** 0–100 readiness score for a job based on prep completed. */
export function readinessScore(job: Job, stories: StarStory[], sessions: MockSession[]): number {
  let score = 0;
  if (job.analysis) score += 25;
  if (job.questions.length > 0) score += 15;
  const practiced = job.questions.filter((q) => q.practiced).length;
  score += Math.min(20, practiced * 4);
  const jobSessions = sessions.filter((s) => s.jobId === job.id && s.endedAt);
  score += Math.min(25, jobSessions.length * 12.5);
  score += Math.min(15, stories.length * 3);
  return Math.round(Math.min(100, score));
}
