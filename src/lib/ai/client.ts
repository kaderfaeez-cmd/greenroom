import type { AiTask } from "@/lib/types";

export interface AiResult<T> {
  ok: boolean;
  engine?: "ai" | "quick";
  data?: T;
  error?: string;
}

/** Thin client for the /api/ai route with consistent error shaping. */
export async function callAi<T>(
  task: AiTask,
  payload: Record<string, unknown>,
): Promise<AiResult<T>> {
  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task, payload }),
    });
    const json = (await res.json()) as AiResult<T>;
    if (!res.ok) {
      return { ok: false, error: json.error ?? `Request failed (${res.status})` };
    }
    return json;
  } catch {
    return { ok: false, error: "Network error — check your connection and retry" };
  }
}
