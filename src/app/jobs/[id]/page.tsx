"use client";

import { Suspense, use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CalendarPlus } from "lucide-react";
import { readinessScore, useGreenroom } from "@/lib/store";
import { useMounted } from "@/hooks/useMounted";
import { STAGES, STAGE_LABELS, type Stage } from "@/lib/types";
import { Tabs } from "@/components/ui/Tabs";
import { ScoreRing } from "@/components/ui/Progress";
import { Skeleton } from "@/components/ui/Misc";
import { AnalysisPanel } from "@/components/workspace/AnalysisPanel";
import { QuestionsPanel } from "@/components/workspace/QuestionsPanel";
import { MockPanel } from "@/components/workspace/MockPanel";
import { NotesPanel } from "@/components/workspace/NotesPanel";
import { countdownLabel } from "@/lib/utils";

type TabValue = "analysis" | "questions" | "mock" | "notes";
const TAB_VALUES: TabValue[] = ["analysis", "questions", "mock", "notes"];

export default function JobWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <Workspace id={id} />
    </Suspense>
  );
}

function Workspace({ id }: { id: string }) {
  const mounted = useMounted();
  const router = useRouter();
  const searchParams = useSearchParams();
  const job = useGreenroom((s) => s.jobs.find((j) => j.id === id));
  const stories = useGreenroom((s) => s.stories);
  const sessions = useGreenroom((s) => s.sessions);
  const updateJob = useGreenroom((s) => s.updateJob);
  const moveJobStage = useGreenroom((s) => s.moveJobStage);

  const [tab, setTab] = useState<TabValue>("analysis");

  // Deep-link support: /jobs/xyz?tab=questions
  useEffect(() => {
    const t = searchParams.get("tab") as TabValue | null;
    if (t && TAB_VALUES.includes(t)) setTab(t);
  }, [searchParams]);

  if (!mounted) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-text-secondary">This job no longer exists.</p>
        <button
          className="mt-3 text-sm font-medium text-accent-text hover:underline"
          onClick={() => router.push("/jobs")}
        >
          Back to pipeline
        </button>
      </div>
    );
  }

  const readiness = readinessScore(job, stories, sessions);

  return (
    <div className="space-y-5">
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-text-tertiary transition-colors hover:text-text-secondary"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Pipeline
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <ScoreRing value={readiness} size={52} />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{job.role}</h1>
            <p className="mt-0.5 text-sm text-text-secondary">
              {job.company}
              {job.interviewDate && (
                <span className="text-warning">
                  {" "}
                  · interview {countdownLabel(job.interviewDate)}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="stage-select">
            Application stage
          </label>
          <select
            id="stage-select"
            value={job.stage}
            onChange={(e) => moveJobStage(job.id, e.target.value as Stage)}
            className="h-8.5 rounded-lg border border-border bg-surface px-2.5 text-sm font-medium text-text transition-colors hover:border-border-strong focus:border-accent focus:outline-none"
          >
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABELS[s]}
              </option>
            ))}
          </select>

          <div className="relative">
            <label className="sr-only" htmlFor="interview-date">
              Interview date
            </label>
            <CalendarPlus
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-tertiary"
              aria-hidden
            />
            <input
              id="interview-date"
              type="date"
              value={job.interviewDate ? job.interviewDate.slice(0, 10) : ""}
              onChange={(e) =>
                updateJob(job.id, {
                  interviewDate: e.target.value
                    ? new Date(e.target.value + "T09:00:00").toISOString()
                    : null,
                })
              }
              className="h-8.5 rounded-lg border border-border bg-surface pl-8.5 pr-2.5 text-sm text-text transition-colors hover:border-border-strong focus:border-accent focus:outline-none"
            />
          </div>
        </div>
      </header>

      <Tabs<TabValue>
        items={[
          { value: "analysis", label: "Analysis" },
          { value: "questions", label: "Questions", count: job.questions.length || undefined },
          {
            value: "mock",
            label: "Mock interview",
            count:
              sessions.filter((s) => s.jobId === job.id && s.endedAt).length || undefined,
          },
          { value: "notes", label: "Notes", count: job.notes.length || undefined },
        ]}
        value={tab}
        onChange={setTab}
      />

      <div>
        {tab === "analysis" && <AnalysisPanel job={job} />}
        {tab === "questions" && <QuestionsPanel job={job} />}
        {tab === "mock" && <MockPanel job={job} />}
        {tab === "notes" && <NotesPanel job={job} />}
      </div>
    </div>
  );
}
