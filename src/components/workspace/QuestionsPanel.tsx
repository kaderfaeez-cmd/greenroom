"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, Circle, HelpCircle, RefreshCw } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { InterviewQuestion, Job, QuestionCategory } from "@/lib/types";
import { QUESTION_CATEGORY_LABELS } from "@/lib/types";
import { useGreenroom } from "@/lib/store";
import { callAi } from "@/lib/ai/client";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, EngineTag, Skeleton } from "@/components/ui/Misc";
import { cn } from "@/lib/utils";

const DIFFICULTY_TONE = {
  easy: "success",
  medium: "warning",
  hard: "danger",
} as const;

export function QuestionsPanel({ job }: { job: Job }) {
  const setQuestions = useGreenroom((s) => s.setQuestions);
  const togglePracticed = useGreenroom((s) => s.togglePracticed);
  const recordActivity = useGreenroom((s) => s.recordActivity);
  const [loading, setLoading] = useState(false);
  const [engine, setEngine] = useState<"ai" | "quick" | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<QuestionCategory | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const generate = async () => {
    if (!job.analysis) return;
    setLoading(true);
    setError(null);
    const result = await callAi<InterviewQuestion[]>("questions", {
      analysis: job.analysis,
    });
    setLoading(false);
    if (result.ok && result.data) {
      setQuestions(job.id, result.data);
      setEngine(result.engine);
      recordActivity();
    } else {
      setError(result.error ?? "Generation failed — try again");
    }
  };

  const categories = useMemo(() => {
    const present = [...new Set(job.questions.map((q) => q.category))];
    return present.sort();
  }, [job.questions]);

  const visible =
    filter === "all" ? job.questions : job.questions.filter((q) => q.category === filter);
  const practicedCount = job.questions.filter((q) => q.practiced).length;

  if (!job.analysis) {
    return (
      <EmptyState
        icon={HelpCircle}
        title="Run the analysis first"
        body="Questions are generated from the analysis so they reference this job's actual stack, seniority, and company — not generic filler."
      />
    );
  }

  if (loading && job.questions.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <RefreshCw className="size-4 animate-spin" aria-hidden />
          Writing questions this interviewer would actually ask…
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }

  if (job.questions.length === 0) {
    return (
      <EmptyState
        icon={HelpCircle}
        title="No questions yet"
        body={`Generate a question set tailored to the ${job.role} role — each with the interviewer's real motive, an answer framework, a strong example, and the traps to avoid.`}
        action={
          <div className="flex flex-col items-center gap-2">
            <Button variant="primary" onClick={generate} loading={loading}>
              Generate questions
            </Button>
            {error && <p className="text-[13px] text-danger">{error}</p>}
          </div>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
            All · {job.questions.length}
          </FilterChip>
          {categories.map((c) => (
            <FilterChip key={c} active={filter === c} onClick={() => setFilter(c)}>
              {QUESTION_CATEGORY_LABELS[c]} ·{" "}
              {job.questions.filter((q) => q.category === c).length}
            </FilterChip>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[13px] tabular-nums text-text-tertiary">
            {practicedCount}/{job.questions.length} practiced
          </span>
          <EngineTag engine={engine} />
          <Button size="sm" onClick={generate} loading={loading}>
            <RefreshCw className="size-3.5" aria-hidden />
            Regenerate
          </Button>
        </div>
      </div>
      {error && <p className="text-[13px] text-danger">{error}</p>}

      <div className="space-y-2">
        {visible.map((q) => {
          const isOpen = expanded === q.id;
          return (
            <div
              key={q.id}
              className={cn(
                "rounded-xl border bg-surface transition-colors duration-150",
                isOpen ? "border-border-strong shadow-[var(--shadow-md)]" : "border-border",
              )}
            >
              <div className="flex items-start gap-3 p-3.5">
                <button
                  onClick={() => togglePracticed(job.id, q.id)}
                  aria-label={q.practiced ? "Mark as not practiced" : "Mark as practiced"}
                  className="mt-0.5 text-text-tertiary transition-colors hover:text-accent"
                >
                  {q.practiced ? (
                    <CheckCircle2 className="size-4.5 text-accent" />
                  ) : (
                    <Circle className="size-4.5" />
                  )}
                </button>
                <button
                  className="flex min-w-0 flex-1 items-start justify-between gap-3 text-left"
                  onClick={() => setExpanded(isOpen ? null : q.id)}
                  aria-expanded={isOpen}
                >
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "text-sm font-medium leading-snug",
                        q.practiced && "text-text-tertiary line-through decoration-border-strong",
                      )}
                    >
                      {q.question}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Badge>{QUESTION_CATEGORY_LABELS[q.category]}</Badge>
                      <Badge tone={DIFFICULTY_TONE[q.difficulty]}>{q.difficulty}</Badge>
                    </div>
                  </div>
                  <ChevronDown
                    className={cn(
                      "mt-1 size-4 shrink-0 text-text-tertiary transition-transform duration-200",
                      isOpen && "rotate-180",
                    )}
                    aria-hidden
                  />
                </button>
              </div>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-4 border-t border-border px-4 py-4 md:px-12">
                      <Detail label="Why they ask this">{q.whyTheyAsk}</Detail>
                      <Detail label="What they're evaluating">
                        <div className="flex flex-wrap gap-1.5">
                          {q.evaluating.map((e) => (
                            <Badge key={e} tone="info">
                              {e}
                            </Badge>
                          ))}
                        </div>
                      </Detail>
                      <Detail label="Answer framework">{q.answerFramework}</Detail>
                      <Detail label="Strong answer example">
                        <blockquote className="rounded-lg border-l-2 border-accent bg-accent-soft/50 px-3.5 py-2.5 text-sm italic leading-relaxed">
                          {q.strongAnswerExample}
                        </blockquote>
                      </Detail>
                      <Detail label="Common mistakes">
                        <ul className="space-y-1.5">
                          {q.commonMistakes.map((m) => (
                            <li key={m} className="flex gap-2 text-sm leading-relaxed">
                              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-danger" aria-hidden />
                              {m}
                            </li>
                          ))}
                        </ul>
                      </Detail>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-7 rounded-lg px-2.5 text-[13px] font-medium transition-colors duration-150",
        active
          ? "bg-accent-soft text-accent-text"
          : "text-text-tertiary hover:bg-bg-subtle hover:text-text-secondary",
      )}
    >
      {children}
    </button>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
        {label}
      </h4>
      {typeof children === "string" ? (
        <p className="text-sm leading-relaxed text-text-secondary">{children}</p>
      ) : (
        children
      )}
    </div>
  );
}
