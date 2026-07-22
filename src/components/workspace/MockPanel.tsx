"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, Send, Square } from "lucide-react";
import { motion } from "framer-motion";
import type { Job, MockScores, MockSession, QuestionCategory } from "@/lib/types";
import { QUESTION_CATEGORY_LABELS } from "@/lib/types";
import { useGreenroom } from "@/lib/store";
import { callAi } from "@/lib/ai/client";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Textarea } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/Misc";
import { cn } from "@/lib/utils";

const MOCK_CATEGORIES: QuestionCategory[] = [
  "recruiter",
  "behavioural",
  "technical",
  "system-design",
];

export function MockPanel({ job }: { job: Job }) {
  const sessions = useGreenroom((s) => s.sessions);
  const startSession = useGreenroom((s) => s.startSession);
  const appendTurn = useGreenroom((s) => s.appendTurn);
  const endSession = useGreenroom((s) => s.endSession);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState<"question" | "feedback" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const active = useMemo(
    () => sessions.find((s) => s.id === activeId) ?? null,
    [sessions, activeId],
  );
  const past = useMemo(
    () => sessions.filter((s) => s.jobId === job.id && s.endedAt),
    [sessions, job.id],
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [active?.turns.length, thinking]);

  const transcript = (session: MockSession): string =>
    session.turns
      .filter((t) => t.role !== "feedback")
      .map((t) => `${t.role === "interviewer" ? "Interviewer" : "Candidate"}: ${t.content}`)
      .join("\n");

  const begin = async (category: QuestionCategory) => {
    if (!job.analysis) return;
    const session = startSession(job.id, category);
    setActiveId(session.id);
    setError(null);
    setThinking("question");
    const result = await callAi<string>("mock-question", {
      analysis: job.analysis,
      category,
      previousTurns: "",
    });
    setThinking(null);
    if (result.ok && result.data) {
      appendTurn(session.id, { role: "interviewer", content: result.data });
    } else {
      setError(result.error ?? "Could not start the interview — try again");
    }
  };

  const submitAnswer = async () => {
    if (!active || !job.analysis || draft.trim().length === 0 || thinking) return;
    const answer = draft.trim();
    const lastQuestion =
      [...active.turns].reverse().find((t) => t.role === "interviewer")?.content ?? "";
    appendTurn(active.id, { role: "candidate", content: answer });
    setDraft("");
    setError(null);

    // 1. Feedback on the answer.
    setThinking("feedback");
    const fb = await callAi<{ scores: MockScores; feedback: string }>("mock-feedback", {
      question: lastQuestion,
      answer,
    });
    if (fb.ok && fb.data) {
      appendTurn(active.id, {
        role: "feedback",
        content: fb.data.feedback,
        scores: fb.data.scores,
      });
    }

    // 2. Next question, aware of the running transcript.
    setThinking("question");
    const updated = useGreenroom.getState().sessions.find((s) => s.id === active.id);
    const next = await callAi<string>("mock-question", {
      analysis: job.analysis,
      category: active.category,
      previousTurns: updated ? transcript(updated) : "",
    });
    setThinking(null);
    if (next.ok && next.data) {
      appendTurn(active.id, { role: "interviewer", content: next.data });
    } else {
      setError(next.error ?? "Interviewer lost connection — end the session or retry");
    }
  };

  const finish = () => {
    if (!active) return;
    endSession(active.id);
    setActiveId(null);
    setDraft("");
  };

  const analysis = job.analysis;
  if (!analysis) {
    return (
      <EmptyState
        icon={Mic}
        title="Run the analysis first"
        body="The mock interviewer uses the analysis to ask questions this company would actually ask, at the right seniority."
      />
    );
  }

  // ---------- Session picker ----------
  if (!active) {
    return (
      <div className="space-y-5">
        <div>
          <h3 className="text-sm font-semibold">Start a mock interview</h3>
          <p className="mt-0.5 text-[13px] text-text-secondary">
            One question at a time. Answer in writing; you get scored feedback after every
            answer, then a follow-up that digs into what you said.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {MOCK_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => begin(cat)}
              aria-label={`Start ${QUESTION_CATEGORY_LABELS[cat]} mock interview`}
              className="group rounded-xl border border-border bg-surface p-4 text-left transition-[border-color,box-shadow] duration-150 hover:border-border-strong hover:shadow-[var(--shadow-md)]"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{QUESTION_CATEGORY_LABELS[cat]}</span>
                <Mic className="size-4 text-text-tertiary transition-colors group-hover:text-accent" aria-hidden />
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
                {cat === "recruiter" && "Motivation, salary, availability — the first filter."}
                {cat === "behavioural" && "STAR stories under pressure, with follow-ups."}
                {cat === "technical" && `Deep-dives on ${analysis.technologies.slice(0, 3).join(", ") || "your stack"}.`}
                {cat === "system-design" && "Architecture trade-offs at this role's level."}
              </p>
            </button>
          ))}
        </div>
        {error && <p className="text-[13px] text-danger">{error}</p>}

        {past.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold">Past sessions</h3>
            <div className="space-y-1.5">
              {past.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface px-3.5 py-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <Badge>{QUESTION_CATEGORY_LABELS[s.category]}</Badge>
                    <span className="text-[13px] text-text-secondary">
                      {new Date(s.startedAt).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                      })}{" "}
                      · {s.turns.filter((t) => t.role === "candidate").length} answers
                    </span>
                  </div>
                  {s.averageScore !== null && (
                    <span
                      className={cn(
                        "text-sm font-semibold tabular-nums",
                        s.averageScore >= 7
                          ? "text-success"
                          : s.averageScore >= 5
                            ? "text-warning"
                            : "text-danger",
                      )}
                    >
                      {s.averageScore}/10
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------- Live session ----------
  return (
    <div className="flex h-[calc(100dvh-16rem)] min-h-96 flex-col rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-danger opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-danger" />
          </span>
          <span className="text-[13px] font-medium">
            {QUESTION_CATEGORY_LABELS[active.category]} interview in progress
          </span>
        </div>
        <Button size="sm" variant="danger" onClick={finish}>
          <Square className="size-3.5" aria-hidden />
          End session
        </Button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {active.turns.map((turn) => (
          <motion.div
            key={turn.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {turn.role === "interviewer" && (
              <div className="max-w-xl">
                <span className="mb-1 block text-xs font-medium text-text-tertiary">
                  Interviewer
                </span>
                <div className="rounded-xl rounded-tl-sm border border-border bg-bg-subtle px-3.5 py-2.5 text-sm leading-relaxed">
                  {turn.content}
                </div>
              </div>
            )}
            {turn.role === "candidate" && (
              <div className="ml-auto max-w-xl">
                <span className="mb-1 block text-right text-xs font-medium text-text-tertiary">
                  You
                </span>
                <div className="rounded-xl rounded-tr-sm bg-accent-soft px-3.5 py-2.5 text-sm leading-relaxed text-accent-text">
                  {turn.content}
                </div>
              </div>
            )}
            {turn.role === "feedback" && turn.scores && (
              <div className="mx-auto max-w-2xl rounded-xl border border-dashed border-border px-4 py-3">
                <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                    Coach feedback
                  </span>
                  <ScorePill label="Structure" value={turn.scores.structure} />
                  <ScorePill label="Clarity" value={turn.scores.clarity} />
                  <ScorePill label="Depth" value={turn.scores.depth} />
                  <ScorePill label="Confidence" value={turn.scores.confidence} />
                </div>
                <div className="whitespace-pre-line text-[13px] leading-relaxed text-text-secondary">
                  {turn.content}
                </div>
              </div>
            )}
          </motion.div>
        ))}
        {thinking && (
          <div className="flex items-center gap-2 text-[13px] text-text-tertiary">
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="size-1.5 animate-bounce rounded-full bg-text-tertiary"
                  style={{ animationDelay: `${i * 120}ms` }}
                />
              ))}
            </span>
            {thinking === "feedback" ? "Coach is reviewing your answer…" : "Interviewer is thinking…"}
          </div>
        )}
        {error && <p className="text-[13px] text-danger">{error}</p>}
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                submitAnswer();
              }
            }}
            placeholder="Type your answer… (⌘⏎ to send)"
            className="min-h-20"
            aria-label="Your answer"
            disabled={thinking !== null}
          />
          <Button
            variant="primary"
            size="icon"
            className="mb-0.5 size-10 shrink-0"
            onClick={submitAnswer}
            disabled={draft.trim().length === 0 || thinking !== null}
            aria-label="Send answer"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ScorePill({ label, value }: { label: string; value: number }) {
  return (
    <span className="flex items-center gap-1 text-xs text-text-tertiary">
      {label}
      <span
        className={cn(
          "font-semibold tabular-nums",
          value >= 7 ? "text-success" : value >= 5 ? "text-warning" : "text-danger",
        )}
      >
        {value}
      </span>
    </span>
  );
}
