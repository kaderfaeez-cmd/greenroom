/**
 * Minimal Gemini REST client. Returns null on a missing key, a non-OK
 * response, an exception or a timeout, so callers can fall back to the
 * heuristic engine. Server-only: the key must never reach the browser.
 */

export const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const TIMEOUT_MS = 45_000;

export async function callGemini(
  prompt: string,
  apiKey: string | undefined,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  if (!apiKey) return null;
  try {
    // Key goes in a header, not the query string: URLs end up in logs and traces.
    const res = await fetchImpl(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(`Gemini error ${res.status}: ${(await res.text()).slice(0, 300)}`);
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
