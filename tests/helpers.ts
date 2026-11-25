import type { JobAnalysis } from "../src/lib/types.ts";
import type { AiHandlerDeps } from "../src/lib/ai/handler.ts";
import { RateLimiter } from "../src/lib/ai/guard.ts";

/** Handler deps for tests: no AI by default and a fresh, generous rate limiter. */
export function testDeps(
  opts: { generate?: AiHandlerDeps["generate"]; limit?: number } = {},
): AiHandlerDeps {
  return {
    generate: opts.generate ?? (async () => null),
    limiter: new RateLimiter(opts.limit ?? 1_000, 60_000),
  };
}

/** A complete, valid JobAnalysis for tests. */
export function sampleAnalysis(overrides: Partial<JobAnalysis> = {}): JobAnalysis {
  return {
    company: "Acme",
    role: "Senior Frontend Engineer",
    seniority: "Senior",
    location: "Remote",
    salary: null,
    requiredSkills: ["5+ years of React"],
    preferredSkills: ["GraphQL"],
    responsibilities: ["Build the design system"],
    technologies: ["react", "typescript"],
    softSkills: ["Communication"],
    atsKeywords: ["react"],
    cultureSignals: ["Fast-paced"],
    hiddenExpectations: ["On-call"],
    likelyStages: ["Recruiter screen"],
    redFlags: [],
    summary: "Senior frontend role at Acme.",
    ...overrides,
  };
}

export const SAMPLE_DESCRIPTION = `Senior Frontend Engineer — Acme, Remote
We are looking for a senior engineer to build our design system with React and TypeScript.
Requirements:
- 5+ years of React
- Strong TypeScript
`;

/** Same-origin browser-style POST to /api/ai. */
export function aiRequest(
  body: unknown,
  opts: { headers?: Record<string, string>; rawBody?: string } = {},
): Request {
  return new Request("http://localhost:3000/api/ai", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      host: "localhost:3000",
      origin: "http://localhost:3000",
      "sec-fetch-site": "same-origin",
      ...opts.headers,
    },
    body: opts.rawBody ?? JSON.stringify(body),
  });
}

export async function readJson(res: Response): Promise<Record<string, unknown>> {
  return (await res.json()) as Record<string, unknown>;
}
