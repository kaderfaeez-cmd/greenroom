import { z } from "zod";
import type { InterviewQuestion, JobAnalysis, MockScores } from "../types.ts";
import { LIMITS } from "./limits.ts";

/**
 * Schemas for everything that crosses the /api/ai boundary: request payloads
 * from the browser (untrusted) and JSON produced by Gemini (untrusted).
 */

const shortText = z.string().max(LIMITS.shortText);
const longText = z.string().max(LIMITS.longText);
const textList = z.array(longText).max(LIMITS.listItems);

export const QUESTION_CATEGORIES = [
  "recruiter",
  "behavioural",
  "technical",
  "system-design",
  "leadership",
  "culture",
  "scenario",
] as const;

export const categorySchema = z.enum(QUESTION_CATEGORIES);

export const jobAnalysisSchema: z.ZodType<JobAnalysis> = z.object({
  company: shortText,
  role: shortText.min(1),
  seniority: shortText,
  location: shortText,
  salary: shortText.nullable().default(null),
  requiredSkills: textList,
  preferredSkills: textList,
  responsibilities: textList,
  technologies: z.array(shortText).max(LIMITS.listItems),
  softSkills: textList,
  atsKeywords: textList,
  cultureSignals: textList,
  hiddenExpectations: textList,
  likelyStages: textList,
  redFlags: textList,
  summary: longText,
});

/** Request body: a discriminated union on `task`. */
export const aiRequestSchema = z.discriminatedUnion("task", [
  z.object({
    task: z.literal("analyze"),
    payload: z.object({
      description: z.string().trim().min(40, "Job description too short — paste the full posting").max(LIMITS.description),
    }),
  }),
  z.object({
    task: z.literal("questions"),
    payload: z.object({ analysis: jobAnalysisSchema }),
  }),
  z.object({
    task: z.literal("mock-question"),
    payload: z.object({
      analysis: jobAnalysisSchema,
      category: categorySchema,
      previousTurns: z.string().max(LIMITS.previousTurns).default(""),
    }),
  }),
  z.object({
    task: z.literal("mock-feedback"),
    payload: z.object({
      question: z.string().max(LIMITS.question),
      answer: z.string().trim().min(1, "Missing answer").max(LIMITS.answer),
    }),
  }),
  z.object({
    task: z.literal("star-suggest"),
    payload: z.object({
      competency: z.string().min(1).max(LIMITS.competency),
      roughNotes: z
        .string()
        .trim()
        .min(20, "Add more detail to your rough notes first (a few sentences)")
        .max(LIMITS.roughNotes),
    }),
  }),
]);

export type ValidAiRequest = z.infer<typeof aiRequestSchema>;

/** Human-readable 400 message for a failed request parse. */
export function describeRequestError(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Invalid request";
  if (issue.path[0] === "task") return "Unknown or missing task";
  if (issue.path[1] === "analysis") {
    return "This job's saved analysis is incomplete — run the analysis again";
  }
  // Custom messages (min lengths) are written for users; others get a generic one.
  if (issue.code === "too_small" && issue.message && !issue.message.startsWith("Too small")) {
    return issue.message;
  }
  if (issue.code === "too_big") return `Input too long: ${issue.path.join(".")}`;
  return `Invalid request: ${issue.path.join(".") || "body"}`;
}

// ---------- Gemini output ----------

const score = z.number().min(0).max(10);

export const mockScoresSchema: z.ZodType<MockScores> = z.object({
  structure: score,
  clarity: score,
  depth: score,
  confidence: score,
  overall: score,
});

export const aiFeedbackSchema = z.object({
  scores: mockScoresSchema,
  feedback: z.string().min(1).max(6_000),
});

export const aiQuestionsSchema = z
  .array(
    z.object({
      category: categorySchema,
      question: z.string().min(1).max(LIMITS.longText),
      whyTheyAsk: longText,
      evaluating: textList,
      answerFramework: longText,
      strongAnswerExample: longText,
      commonMistakes: textList,
      difficulty: z.enum(["easy", "medium", "hard"]),
    }) satisfies z.ZodType<Omit<InterviewQuestion, "id" | "practiced">>,
  )
  .min(1)
  .max(20);

export const aiStarSchema = z.object({
  title: shortText.min(1),
  situation: longText.min(1),
  task: longText,
  action: longText,
  result: longText,
  tags: z.array(shortText).max(10),
});

export const aiMockQuestionSchema = z.string().trim().min(6).max(LIMITS.longText);
