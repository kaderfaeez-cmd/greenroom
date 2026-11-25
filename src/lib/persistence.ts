import { z } from "zod";
import { STAGES } from "./types.ts";
import type { Job, JobNote, MockSession, MockTurn, StarStory, InterviewQuestion } from "./types.ts";
import { categorySchema, jobAnalysisSchema, mockScoresSchema } from "./ai/schemas.ts";

/**
 * Shape, version and migration of the data persisted in localStorage
 * (key "greenroom-v1") and in backup files. Both are untrusted on read.
 */

/** Bump when the persisted shape changes, and add a step to migrateState. */
export const STORE_VERSION = 1;

export interface PersistedData {
  jobs: Job[];
  stories: StarStory[];
  sessions: MockSession[];
  activityDays: string[];
}

const noteSchema: z.ZodType<JobNote> = z.object({
  id: z.string(),
  text: z.string(),
  createdAt: z.string(),
});

const questionSchema: z.ZodType<InterviewQuestion> = z.object({
  id: z.string(),
  category: categorySchema,
  question: z.string(),
  whyTheyAsk: z.string(),
  evaluating: z.array(z.string()),
  answerFramework: z.string(),
  strongAnswerExample: z.string(),
  commonMistakes: z.array(z.string()),
  difficulty: z.enum(["easy", "medium", "hard"]),
  practiced: z.boolean().default(false),
});

const jobSchema: z.ZodType<Job> = z.object({
  id: z.string(),
  company: z.string(),
  role: z.string(),
  stage: z.enum(STAGES),
  descriptionRaw: z.string(),
  // Derived data: if it is unusable, drop it (the user can regenerate) rather than the job.
  analysis: jobAnalysisSchema.nullable().catch(null),
  questions: z.array(questionSchema).catch([]),
  notes: z.array(noteSchema).default([]),
  interviewDate: z.string().nullable().default(null),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const storySchema: z.ZodType<StarStory> = z.object({
  id: z.string(),
  title: z.string(),
  competency: z.string(),
  situation: z.string().default(""),
  task: z.string().default(""),
  action: z.string().default(""),
  result: z.string().default(""),
  tags: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const turnSchema: z.ZodType<MockTurn> = z.object({
  id: z.string(),
  role: z.enum(["interviewer", "candidate", "feedback"]),
  content: z.string(),
  scores: mockScoresSchema.optional(),
  at: z.string(),
});

const sessionSchema: z.ZodType<MockSession> = z.object({
  id: z.string(),
  jobId: z.string(),
  category: categorySchema,
  turns: z.array(turnSchema).default([]),
  startedAt: z.string(),
  endedAt: z.string().nullable().default(null),
  averageScore: z.number().nullable().default(null),
});

const dayKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Strict: the whole document must be valid (used for backup import). */
export const persistedDataSchema: z.ZodType<PersistedData> = z.object({
  jobs: z.array(jobSchema).default([]),
  stories: z.array(storySchema).default([]),
  sessions: z.array(sessionSchema).default([]),
  activityDays: z.array(dayKeySchema).default([]),
});

/** Forgiving: keeps every valid entry and drops the ones the app could not render. */
function keepValid<T>(items: unknown, schema: z.ZodType<T>): T[] {
  if (!Array.isArray(items)) return [];
  return items.flatMap((item) => {
    const parsed = schema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

/**
 * Upgrades a stored document from `fromVersion` to STORE_VERSION.
 * v0 -> v1: no renames; fills fields that older saves lack (e.g. `notes`)
 * and drops entries that would crash rendering, keeping all valid data.
 */
export function migrateState(persisted: unknown, fromVersion: number): PersistedData {
  const state = (typeof persisted === "object" && persisted !== null ? persisted : {}) as Record<
    string,
    unknown
  >;
  if (fromVersion > STORE_VERSION) {
    console.warn(`Stored data is from a newer version (${fromVersion}); loading what is readable`);
  }
  return {
    jobs: keepValid(state.jobs, jobSchema),
    stories: keepValid(state.stories, storySchema),
    sessions: keepValid(state.sessions, sessionSchema),
    activityDays: keepValid(state.activityDays, dayKeySchema),
  };
}
