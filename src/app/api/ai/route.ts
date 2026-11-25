import { callGemini } from "@/lib/ai/gemini";
import { handleAiPost } from "@/lib/ai/handler";
import { DAILY_AI_CAP, DailyCap, RATE_LIMIT, RateLimiter } from "@/lib/ai/guard";

export const runtime = "nodejs";
export const maxDuration = 60;

// Module scope = one set of counters per serverless instance (see guard.ts).
const limiter = new RateLimiter(RATE_LIMIT.limit, RATE_LIMIT.windowMs);
const dailyCap = new DailyCap(DAILY_AI_CAP);

async function generate(prompt: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!dailyCap.tryConsume()) {
    console.warn("/api/ai daily AI cap reached on this instance; serving the quick engine");
    return null;
  }
  return callGemini(prompt, apiKey);
}

export async function POST(req: Request): Promise<Response> {
  return handleAiPost(req, { generate, limiter });
}
