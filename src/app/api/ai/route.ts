import { NextRequest, NextResponse } from "next/server";
import {
  analyzePrompt,
  mockFeedbackPrompt,
  mockQuestionPrompt,
  questionsPrompt,
  starSuggestPrompt,
} from "@/lib/ai/prompts";
import {
  analyzeFallback,
  questionsFallback,
  scoreFallback,
} from "@/lib/ai/fallback";
import type { AiRequest, JobAnalysis, QuestionCategory } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

async function callGemini(prompt: string): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`${GEMINI_URL}?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) {
      console.error(`Gemini error ${res.status}: ${await res.text()}`);
      return null;
    }
    const data = await res.json();
    const text: unknown = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof text === "string" ? text : null;
  } catch (err) {
    console.error("Gemini request failed:", err);
    return null;
  }
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

function bad(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req: NextRequest) {
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
      const raw = await callGemini(analyzePrompt(description));
      const parsed = raw ? parseJson<JobAnalysis>(raw) : null;
      if (parsed && Array.isArray(parsed.requiredSkills)) {
        return NextResponse.json({ ok: true, engine: "ai", data: parsed });
      }
      return NextResponse.json({
        ok: true,
        engine: "quick",
        data: analyzeFallback(description),
      });
    }

    case "questions": {
      const analysis = payload.analysis as JobAnalysis | undefined;
      if (!analysis?.role) return bad("Missing analysis");
      const raw = await callGemini(questionsPrompt(analysis));
      type RawQuestion = Omit<
        import("@/lib/types").InterviewQuestion,
        "id" | "practiced"
      >;
      const parsed = raw ? parseJson<RawQuestion[]>(raw) : null;
      if (parsed && Array.isArray(parsed) && parsed.length > 0 && parsed[0].question) {
        const withIds = parsed.map((q, i) => ({
          ...q,
          id: `q_${Date.now().toString(36)}_${i}`,
          practiced: false,
        }));
        return NextResponse.json({ ok: true, engine: "ai", data: withIds });
      }
      return NextResponse.json({
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
      const raw = await callGemini(mockQuestionPrompt(analysis, category, previousTurns));
      if (raw && raw.trim().length > 5) {
        return NextResponse.json({ ok: true, engine: "ai", data: raw.trim() });
      }
      // Fallback: serve next unused template question for the category.
      const pool = questionsFallback(analysis).filter((q) => q.category === category);
      const askedCount = (previousTurns.match(/Interviewer:/g) ?? []).length;
      const next = pool[askedCount % Math.max(pool.length, 1)];
      return NextResponse.json({
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
      const raw = await callGemini(mockFeedbackPrompt(question, answer));
      type FeedbackShape = {
        scores: import("@/lib/types").MockScores;
        feedback: string;
      };
      const parsed = raw ? parseJson<FeedbackShape>(raw) : null;
      if (parsed?.scores && typeof parsed.feedback === "string") {
        return NextResponse.json({ ok: true, engine: "ai", data: parsed });
      }
      return NextResponse.json({ ok: true, engine: "quick", data: scoreFallback(answer) });
    }

    case "star-suggest": {
      const competency = payload.competency;
      const roughNotes = payload.roughNotes;
      if (typeof competency !== "string" || typeof roughNotes !== "string" || roughNotes.trim().length < 20) {
        return bad("Add more detail to your rough notes first (a few sentences)");
      }
      const raw = await callGemini(starSuggestPrompt(competency, roughNotes));
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
        return NextResponse.json({ ok: true, engine: "ai", data: parsed });
      }
      return NextResponse.json({
        ok: false,
        error:
          "AI drafting needs a GEMINI_API_KEY. Your notes are saved — structure them manually with the four STAR fields, or add a key in Settings.",
      });
    }

    default:
      return bad(`Unknown task: ${task satisfies never}`);
  }
}
