import {
  analyzePrompt,
  mockFeedbackPrompt,
  mockQuestionPrompt,
  questionsPrompt,
  starSuggestPrompt,
} from "./prompts.ts";
import { analyzeFallback, questionsFallback, scoreFallback } from "./fallback.ts";
import type { z } from "zod";
import {
  MAX_BODY_BYTES,
  clientKey,
  isSameOrigin,
  readBodyLimited,
  type RateLimiter,
} from "./guard.ts";
import {
  aiFeedbackSchema,
  aiMockQuestionSchema,
  aiQuestionsSchema,
  aiRequestSchema,
  aiStarSchema,
  describeRequestError,
  jobAnalysisSchema,
  type ValidAiRequest,
} from "./schemas.ts";

/**
 * Framework-free implementation of POST /api/ai. It takes a standard Request
 * and returns a standard Response, so it can be tested with `node --test`
 * without booting Next.js. `generate` is the AI call (Gemini in production);
 * it returns null when the AI engine is unavailable.
 */
export interface AiHandlerDeps {
  generate: (prompt: string) => Promise<string | null>;
  limiter: RateLimiter;
}

/** Strip markdown fences and parse; returns null on malformed JSON. */
function parseJson(raw: string): unknown {
  try {
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

/** Model output is untrusted: accept it only if it matches the schema exactly. */
function parseAiJson<T>(raw: string | null, schema: z.ZodType<T>): T | null {
  if (!raw) return null;
  const result = schema.safeParse(parseJson(raw));
  return result.success ? result.data : null;
}

function bad(message: string, status = 400): Response {
  return Response.json({ ok: false, error: message }, { status });
}

export async function handleAiPost(req: Request, deps: AiHandlerDeps): Promise<Response> {
  if (!isSameOrigin(req.headers)) return bad("Cross-site requests are not allowed", 403);

  const rate = deps.limiter.check(clientKey(req.headers));
  if (!rate.ok) {
    return Response.json(
      { ok: false, error: "Too many requests — wait a few minutes and try again" },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
    );
  }

  const text = await readBodyLimited(req, MAX_BODY_BYTES);
  if (text === null) return bad("Request too large", 413);

  let raw: unknown;
  try {
    raw = JSON.parse(text);
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
      const parsed = parseAiJson(await generate(analyzePrompt(description)), jobAnalysisSchema);
      if (parsed) {
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
      const parsed = parseAiJson(await generate(questionsPrompt(analysis)), aiQuestionsSchema);
      if (parsed) {
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
      const question = aiMockQuestionSchema.safeParse(raw);
      if (question.success) {
        return Response.json({ ok: true, engine: "ai", data: question.data });
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
      const parsed = parseAiJson(await generate(mockFeedbackPrompt(question, answer)), aiFeedbackSchema);
      if (parsed) {
        return Response.json({ ok: true, engine: "ai", data: parsed });
      }
      return Response.json({ ok: true, engine: "quick", data: scoreFallback(answer) });
    }

    case "star-suggest": {
      const { competency, roughNotes } = request.payload;
      const parsed = parseAiJson(await generate(starSuggestPrompt(competency, roughNotes)), aiStarSchema);
      if (parsed) {
        return Response.json({ ok: true, engine: "ai", data: parsed });
      }
      return Response.json({
        ok: false,
        error:
          "AI drafting isn't available right now (the AI engine is not set up on this site or didn't return a usable draft). Your notes are kept — structure them manually with the four STAR fields.",
      });
    }
  }
}
