import type { AiTask } from "../types.ts";

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
  let res: Response;
  try {
    res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task, payload }),
    });
  } catch {
    return { ok: false, error: "Network error — check your connection and retry" };
  }

  // Error pages (a crash, a platform timeout) may not be JSON: never let parsing mask the status.
  const json = await res.json().catch(() => null);
  const isResult = typeof json === "object" && json !== null && typeof json.ok === "boolean";
  if (!res.ok) {
    const message = isResult && typeof json.error === "string" ? json.error : null;
    return { ok: false, error: message ?? `Server error (${res.status}) — try again in a moment` };
  }
  if (!isResult) {
    return { ok: false, error: `Unexpected response from the server (${res.status})` };
  }
  return json as AiResult<T>;
}
