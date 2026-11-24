import type { Job, MockSession, StarStory } from "./types.ts";
import { dayKey } from "./dates.ts";

/** Consecutive-day practice streak ending today or yesterday. */
export function computeStreak(activityDays: string[], now: Date = new Date()): number {
  const days = new Set(activityDays);
  const cursor = new Date(now);
  let streak = 0;
  // Allow streak to survive if today has no activity yet.
  if (!days.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (days.has(dayKey(cursor))) {
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
