import { callGemini } from "@/lib/ai/gemini";
import { handleAiPost } from "@/lib/ai/handler";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request): Promise<Response> {
  return handleAiPost(req, {
    generate: (prompt) => callGemini(prompt, process.env.GEMINI_API_KEY),
  });
}
