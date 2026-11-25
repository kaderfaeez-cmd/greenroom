@AGENTS.md

# Greenroom

## What this is
Local-first interview-prep workspace for job seekers: paste a job description, get an analysis,
a tailored question bank, written mock interviews with scored feedback and a STAR story library.
Single-user, no accounts. Portfolio project, live at https://greenroom-lime.vercel.app (Vercel).

## Stack
- Next.js 16 (App Router, Turbopack), React 19, TypeScript strict, Tailwind v4.
- npm (`package-lock.json`). Install: `npm ci`. Node 22.18+ / 24 needed for `npm test`
  (native TypeScript type stripping).
- Database: none. All user data is in the browser's `localStorage` (zustand `persist`, key
  `greenroom-v1`; theme in `greenroom-theme`).
- Auth: none.
- External services: Google Gemini REST API (optional, `GEMINI_API_KEY`), server-side only.

## Architecture
- `src/app/**/page.tsx`: every page is a client component; `useMounted` gates rendering until
  the store has hydrated from `localStorage`.
- `src/app/api/ai/route.ts`: the only server code. A thin wrapper around
  `src/lib/ai/handler.ts` (`handleAiPost`, framework-free: standard `Request` in, `Response` out)
  and `src/lib/ai/gemini.ts` (`callGemini`).
- `src/lib/ai/fallback.ts`: deterministic heuristic engine used when Gemini is not configured,
  fails, or returns unusable output. Results carry `engine: "ai" | "quick"`.
- `src/lib/store.ts`: zustand store. Pure helpers live in `progress.ts` (streak, readiness),
  `dates.ts` and `backup.ts` so they can be tested without the store.
- `src/lib/ai/client.ts`: browser wrapper for `/api/ai`.
- `src/lib/persistence.ts`: zod schema of the persisted data, `STORE_VERSION` and `migrateState`
  (wired into zustand `persist` as `version`/`migrate`). When the stored shape changes, bump
  `STORE_VERSION` and add a migration step there, with a test. `backup.ts` validates imported
  backups against the same schema (strict: a damaged file is rejected whole).

### Import convention
Modules under `src/lib/` that tests load use **relative imports with a `.ts` extension**
(`import { uid } from "../utils.ts"`), because `node --test` does not understand the `@/` alias.
Type-only imports must use `import type`. UI code under `src/app` and `src/components` keeps `@/`.

## Commands
| Purpose | Command |
|---|---|
| Dev server | `npm run dev` (port 3000) |
| Lint | `npm run lint` |
| Type check | `npx tsc --noEmit` |
| Unit tests | `npm test` (`node --test` over `tests/**/*.test.ts`) |
| Production build | `npm run build` |
| Format check | gap: no formatter configured |
| E2E tests | gap: none |

## Quality gate for this repo
`npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`, then review `git diff`.
There is no CI workflow yet. Known pre-existing lint errors (`react-hooks/set-state-in-effect`)
in `useMounted.ts`, `ThemeToggle.tsx`, `jobs/page.tsx` and `jobs/[id]/page.tsx` make
`npm run lint` exit non-zero; do not add new ones.

## Testing
- `node --test` with native TS; tests in `tests/`. No network: tests never set
  `GEMINI_API_KEY` and inject a fake `generate` into `handleAiPost`.
- Must stay covered: the `/api/ai` request validation and fallbacks, the heuristic engine.

## Security-sensitive areas
- `POST /api/ai` is public (no auth) and spends the owner's Gemini quota. `handleAiPost` checks,
  in order: same-origin (`src/lib/ai/guard.ts`, 403), per-IP rate limit (30 / 10 min, 429),
  body size (64 KB, 413), zod request schema with per-field limits (`schemas.ts`, `limits.ts`,
  400). The route adds a daily cap of 500 Gemini calls (then the quick engine answers).
  The limiter and cap are **in-memory per serverless instance** (no database): they reset on
  cold starts and multiply with instance count. Documented in README "Abuse protection".
- Gemini output is untrusted: every result is checked against a zod schema; mismatch means the
  quick engine (or `ok: false` for STAR drafting).
- Untrusted input: every `/api/ai` request body, Gemini output, imported backup files and the
  contents of `localStorage`.
- React renders all AI/user text as text nodes; the only `dangerouslySetInnerHTML` is the
  constant theme script in `layout.tsx`.

## Deployment
- Vercel, Node.js serverless runtime (`runtime = "nodejs"`, `maxDuration = 60`). How deploys
  are triggered (git integration or CLI) is not recorded here; never push or deploy without the
  owner's go-ahead.
- Env vars (names in `.env.example`): `GEMINI_API_KEY` (optional; without it the app runs on
  the quick engine).
- Security headers and the CSP are set in `next.config.ts` (static CSP, `'unsafe-inline'`
  scripts because of the App Router's inline payload and the theme script).

## Conventions
- Conventional commits. API errors use `{ ok: false, error }`; successes `{ ok: true, engine, data }`.
- State updates in the store are immutable (`map` + spread).
