import {
  analyzePrompt,
  mockFeedbackPrompt,
  mockQuestionPrompt,
  questionsPrompt,
  starSuggestPrompt,
} from "./prompts.ts";
import { analyzeFallback, questionsFallback, scoreFallback } from "./fallback.ts";
import { aiRequestSchema, describeRequestError, type ValidAiRequest } from "./schemas.ts";
import type { InterviewQuestion, JobAnalysis, MockScores } from "../types.ts";

/**
 * Framework-free implementation of POST /api/ai. It takes a standard Request
 * and returns a standard Response, so it can be tested with `node --test`
 * without booting Next.js. `generate` is the AI call (Gemini in production);
 * it returns null when the AI engine is unavailable.
 */
export interface AiHandlerDeps {
  generate: (prompt: string) => Promise<string | null>;
}

/** Strip markdown fences and parse; returns null on malformed JSON. */
function parseJson<T>(raw: string): T | null {
  try {
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

function bad(message: string, status = 400): Response {
  return Response.json({ ok: false, error: message }, { status });
}

export async function handleAiPost(req: Request, deps: AiHandlerDeps): Promise<Response> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }
  const parsed = aiRequestSchema.safeParse(raw);
  if (!parsed.success) return bad(describeRequestError(parsed.error));

  try {
    return await runTask(parsed.data, deps.generate);
  } catch (err) {
    console.error(`/api/ai ${parsed.data.task} failed:`, err);
    return bad("Something went wrong on our side — try again", 500);
  }
}

async function runTask(
  request: ValidAiRequest,
  generate: AiHandlerDeps["generate"],
): Promise<Response> {
  switch (request.task) {
    case "analyze": {
      const { description } = request.payload;
      const raw = await generate(analyzePrompt(description));
      const parsed = raw ? parseJson<JobAnalysis>(raw) : null;
      if (parsed && Array.isArray(parsed.requiredSkills)) {
        return Response.json({ ok: true, engine: "ai", data: parsed });
      }
      return Response.json({
        ok: true,
        engine: "quick",
        data: analyzeFallback(description),
      });
    }

    case "questions": {
      const { analysis } = request.payload;
      const raw = await generate(questionsPrompt(analysis));
      type RawQuestion = Omit<InterviewQuestion, "id" | "practiced">;
      const parsed = raw ? parseJson<RawQuestion[]>(raw) : null;
      if (parsed && Array.isArray(parsed) && parsed.length > 0 && parsed[0].question) {
        const withIds = parsed.map((q, i) => ({
          ...q,
          id: `q_${Date.now().toString(36)}_${i}`,
          practiced: false,
        }));
        return Response.json({ ok: true, engine: "ai", data: withIds });
      }
      return Response.json({
        ok: true,
        engine: "quick",
        data: questionsFallback(analysis),
      });
    }

    case "mock-question": {
      const { analysis, category, previousTurns } = request.payload;
      const raw = await generate(mockQuestionPrompt(analysis, category, previousTurns));
      if (raw && raw.trim().length > 5) {
        return Response.json({ ok: true, engine: "ai", data: raw.trim() });
      }
      // Fallback: serve next unused template question for the category.
      const pool = questionsFallback(analysis).filter((q) => q.category === category);
      const askedCount = (previousTurns.match(/Interviewer:/g) ?? []).length;
      const next = pool[askedCount % Math.max(pool.length, 1)];
      return Response.json({
        ok: true,
        engine: "quick",
        data: next?.question ?? "Tell me about a recent project you're proud of.",
      });
    }

    case "mock-feedback": {
      const { question, answer } = request.payload;
      const raw = await generate(mockFeedbackPrompt(question, answer));
      type FeedbackShape = { scores: MockScores; feedback: string };
      const parsed = raw ? parseJson<FeedbackShape>(raw) : null;
      if (parsed?.scores && typeof parsed.feedback === "string") {
        return Response.json({ ok: true, engine: "ai", data: parsed });
      }
      return Response.json({ ok: true, engine: "quick", data: scoreFallback(answer) });
    }

    case "star-suggest": {
      const { competency, roughNotes } = request.payload;
      const raw = await generate(starSuggestPrompt(competency, roughNotes));
      type StarShape = {
        title: string;
        situation: string;
        task: string;
        action: string;
        result: string;
        tags: string[];
      };
      const parsed = raw ? parseJson<StarShape>(raw) : null;
      if (parsed?.situation) {
        return Response.json({ ok: true, engine: "ai", data: parsed });
      }
      return Response.json({
        ok: false,
        error:
          "AI drafting needs a GEMINI_API_KEY. Your notes are saved — structure them manually with the four STAR fields, or add a key in Settings.",
      });
    }
  }
}
