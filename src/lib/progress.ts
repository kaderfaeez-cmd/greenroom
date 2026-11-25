import type { Job, MockSession, MockTurn, StarStory } from "./types.ts";
import { dayKey } from "./dates.ts";

/** Mean of the overall scores on feedback turns, one decimal; null if none. */
export function averageOverall(turns: MockTurn[]): number | null {
  const scores = turns.flatMap((t) => (t.role === "feedback" && t.scores ? [t.scores.overall] : []));
  if (scores.length === 0) return null;
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
}

/**
 * Sessions left open by a closed tab or a failed start: ones without any
 * answer are dropped; answered ones are ended at their last turn and scored.
 */
export function closeOrphanedSessions(sessions: MockSession[]): MockSession[] {
  return sessions.flatMap((s) => {
    if (s.endedAt) return [s];
    if (!s.turns.some((t) => t.role === "candidate")) return [];
    const lastAt = s.turns[s.turns.length - 1]?.at ?? s.startedAt;
    return [{ ...s, endedAt: lastAt, averageScore: averageOverall(s.turns) }];
  });
}

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
