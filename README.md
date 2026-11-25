# Greenroom

**The room where you prepare before going on stage.**

Paste a job description. Greenroom builds your complete interview preparation workspace — analysis, tailored questions, mock interviews with scored feedback, and a STAR story library.

**Live:** [greenroom-lime.vercel.app](https://greenroom-lime.vercel.app)

---

## What it does

| Surface | What you get |
|---|---|
| **Job analysis** | Required vs nice-to-have skills, technologies, hidden expectations, culture signals, likely interview stages, red flags, ATS keywords |
| **Question bank** | 12 questions tailored to the posting — each with the interviewer's real motive, an answer framework, a strong example answer, and common traps |
| **Mock interview** | One question at a time, like a real interviewer. Every answer scored on structure / clarity / depth / confidence, with coaching feedback and a follow-up that digs into what you said |
| **STAR stories** | Turn rough notes into tight STAR stories with AI drafting; build a bench of 8 that covers most behavioural interviews |
| **Pipeline** | Kanban board from wishlist to offer, drag-and-drop, readiness score per job |
| **Dashboard** | Preparation focus ranked by readiness, next actions, interview countdowns, practice streak |

## Architecture

- **Local-first** — all data lives in `localStorage` (zustand + persist). No accounts, no database. Export/import JSON backups in Settings.
- **Two-tier AI engine** — deep analysis via Google Gemini (`GEMINI_API_KEY`, free tier) with a deterministic heuristic engine as automatic fallback. The UI labels which engine produced each result. The app is fully functional with zero keys.
- **Design system** — OKLCH token palette (light + dark), Geist type, quiet Linear-style surfaces. Motion communicates state only.

## Abuse protection for `/api/ai`

`POST /api/ai` is public and spends the site owner's Gemini quota, so it:

- refuses cross-site requests (`Origin` must match the host; `Sec-Fetch-Site` must be `same-origin`). This stops other websites from using the endpoint and casual `curl` use; a scripted client can still forge these headers, which is what the limits below are for;
- caps the request body at 64 KB and every field at a fixed length (`src/lib/ai/limits.ts`);
- rate-limits each client IP to 30 requests per 10 minutes (HTTP 429 with `Retry-After`);
- stops calling Gemini after 500 calls per UTC day and answers with the quick engine instead.

**Limitation (serverless):** there is no database, so the rate limiter and daily cap are in-memory and **per server instance**. On Vercel each warm instance has its own counters and a cold start resets them, so the real ceiling is the limits above multiplied by the number of live instances. For a hard ceiling, also set a quota on the API key in Google AI Studio / Cloud Console, or move the counters to a shared store such as Upstash Redis.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · zustand · zod · Framer Motion · cmdk (⌘K palette) · Lucide

## Run locally

```bash
npm install
npm run dev
npm test        # unit tests (node --test, Node 22.18+ / 24)
```

Optional — enable the full AI engine: copy `.env.example` to `.env.local` and set

```bash
GEMINI_API_KEY=your_free_key   # https://aistudio.google.com/apikey
```

## Keyboard

| Keys | Action |
|---|---|
| `⌘K` / `Ctrl+K` | Global search — jobs, stories, pages |
| `⌘⏎` | Send answer in mock interview / save note |
| `Esc` | Close any dialog |
