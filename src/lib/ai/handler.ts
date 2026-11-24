import {
  analyzePrompt,
  mockFeedbackPrompt,
  mockQuestionPrompt,
  questionsPrompt,
  starSuggestPrompt,
} from "./prompts.ts";
import { analyzeFallback, questionsFallback, scoreFallback } from "./fallback.ts";
import type {
  AiRequest,
  InterviewQuestion,
  JobAnalysis,
  MockScores,
  QuestionCategory,
} from "../types.ts";

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
  const { generate } = deps;
  let body: AiRequest;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }
  const { task, payload } = body;
  if (!task || typeof payload !== "object" || payload === null) {
    return bad("Missing task or payload");
  }

  switch (task) {
    case "analyze": {
      const description = payload.description;
      if (typeof description !== "string" || description.trim().length < 40) {
        return bad("Job description too short — paste the full posting");
      }
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
      const analysis = payload.analysis as JobAnalysis | undefined;
      if (!analysis?.role) return bad("Missing analysis");
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
      const analysis = payload.analysis as JobAnalysis | undefined;
      const category = payload.category as QuestionCategory | undefined;
      const previousTurns = typeof payload.previousTurns === "string" ? payload.previousTurns : "";
      if (!analysis?.role || !category) return bad("Missing analysis or category");
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
      const question = payload.question;
      const answer = payload.answer;
      if (typeof question !== "string" || typeof answer !== "string" || answer.trim().length === 0) {
        return bad("Missing question or answer");
      }
      const raw = await generate(mockFeedbackPrompt(question, answer));
      type FeedbackShape = { scores: MockScores; feedback: string };
      const parsed = raw ? parseJson<FeedbackShape>(raw) : null;
      if (parsed?.scores && typeof parsed.feedback === "string") {
        return Response.json({ ok: true, engine: "ai", data: parsed });
      }
      return Response.json({ ok: true, engine: "quick", data: scoreFallback(answer) });
    }

    case "star-suggest": {
      const competency = payload.competency;
      const roughNotes = payload.roughNotes;
      if (typeof competency !== "string" || typeof roughNotes !== "string" || roughNotes.trim().length < 20) {
        return bad("Add more detail to your rough notes first (a few sentences)");
      }
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

    default:
      return bad(`Unknown task: ${task satisfies never}`);
  }
}
