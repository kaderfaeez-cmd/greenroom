"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ArrowRight,
  Briefcase,
  CalendarClock,
  Flame,
  MessageSquareText,
  Plus,
  Sparkle,
  Target,
} from "lucide-react";
import { computeStreak, readinessScore, useGreenroom } from "@/lib/store";
import { useMounted } from "@/hooks/useMounted";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Progress, ScoreRing } from "@/components/ui/Progress";
import { EmptyState, Skeleton } from "@/components/ui/Misc";
import { STAGE_LABELS, type Job, type StarStory } from "@/lib/types";
import { countdownLabel } from "@/lib/utils";

export default function DashboardPage() {
  const mounted = useMounted();
  const jobs = useGreenroom((s) => s.jobs);
  const stories = useGreenroom((s) => s.stories);
  const sessions = useGreenroom((s) => s.sessions);
  const activityDays = useGreenroom((s) => s.activityDays);

  const streak = useMemo(() => computeStreak(activityDays), [activityDays]);
  const active = useMemo(() => jobs.filter((j) => j.stage !== "closed"), [jobs]);
  const upcoming = useMemo(
    () =>
      jobs
        .filter(
          (j) =>
            j.interviewDate &&
            new Date(j.interviewDate) >= new Date(new Date().toDateString()),
        )
        .sort((a, b) => a.interviewDate!.localeCompare(b.interviewDate!)),
    [jobs],
  );
  const completedSessions = sessions.filter((s) => s.endedAt).length;
  const practicedCount = jobs.reduce(
    (acc, j) => acc + j.questions.filter((q) => q.practiced).length,
    0,
  );

  if (!mounted) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{greeting}.</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            {upcoming.length > 0
              ? `Next interview ${countdownLabel(upcoming[0].interviewDate!)} — ${upcoming[0].role} at ${upcoming[0].company}.`
              : active.length > 0
                ? `${active.length} active application${active.length === 1 ? "" : "s"} in your pipeline.`
                : "Paste a job description to start preparing."}
          </p>
        </div>
        <Link href="/jobs?new=1">
          <Button variant="primary">
            <Plus className="size-4" aria-hidden />
            Add job
          </Button>
        </Link>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Briefcase className="size-4" />}
          label="Active applications"
          value={active.length}
        />
        <StatCard
          icon={<MessageSquareText className="size-4" />}
          label="Mock interviews"
          value={completedSessions}
        />
        <StatCard
          icon={<Target className="size-4" />}
          label="Questions practiced"
          value={practicedCount}
        />
        <StatCard
          icon={<Flame className="size-4" />}
          label="Practice streak"
          value={streak}
          suffix={streak === 1 ? "day" : "days"}
          highlight={streak >= 3}
        />
      </div>

      {jobs.length === 0 ? (
        <EmptyState
          icon={Sparkle}
          title="Your greenroom is empty"
          body="Add your first job — paste the description and Greenroom builds your full preparation workspace: analysis, tailored questions, mock interviews."
          action={
            <Link href="/jobs?new=1">
              <Button variant="primary">
                <Plus className="size-4" aria-hidden />
                Add your first job
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-3">
            <Card>
              <CardHeader
                title="Preparation focus"
                action={
                  <Link
                    href="/jobs"
                    className="flex items-center gap-1 text-[13px] font-medium text-accent-text hover:underline"
                  >
                    Pipeline <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                }
              />
              <div className="space-y-1 px-2 pb-2">
                {[...active]
                  .sort(
                    (a, b) =>
                      readinessScore(a, stories, sessions) -
                      readinessScore(b, stories, sessions),
                  )
                  .slice(0, 5)
                  .map((job) => {
                    const score = readinessScore(job, stories, sessions);
                    return (
                      <Link
                        key={job.id}
                        href={`/jobs/${job.id}`}
                        className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-bg-subtle"
                      >
                        <ScoreRing value={score} size={40} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium">{job.role}</span>
                            <Badge>{STAGE_LABELS[job.stage]}</Badge>
                          </div>
                          <div className="mt-0.5 truncate text-[13px] text-text-secondary">
                            {job.company}
                            {job.interviewDate &&
                              ` · interview ${countdownLabel(job.interviewDate)}`}
                          </div>
                        </div>
                        <span className="text-sm font-semibold tabular-nums text-text-secondary">
                          {score}%
                        </span>
                      </Link>
                    );
                  })}
                {active.length === 0 && (
                  <p className="px-2 pb-3 text-[13px] text-text-tertiary">
                    No active applications — everything is closed. Add a new job to keep momentum.
                  </p>
                )}
              </div>
            </Card>

            <Card>
              <CardHeader title="Next actions" />
              <ul className="space-y-1.5 px-4 pb-4 text-sm">
                {buildNextActions({
                  jobs: active,
                  stories,
                  sessionsCount: completedSessions,
                }).map((a) => (
                  <li key={a.href + a.label} className="flex items-center gap-2">
                    <span className="size-1 shrink-0 rounded-full bg-accent" aria-hidden />
                    <Link
                      href={a.href}
                      className="text-text-secondary hover:text-text hover:underline"
                    >
                      {a.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <div className="space-y-4 lg:col-span-2">
            <Card>
              <CardHeader title="Upcoming interviews" />
              <div className="space-y-1 px-2 pb-3">
                {upcoming.length === 0 && (
                  <p className="px-2 pb-2 text-[13px] text-text-tertiary">
                    Nothing scheduled. Set an interview date inside a job workspace and the
                    countdown appears here.
                  </p>
                )}
                {upcoming.slice(0, 4).map((job) => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-bg-subtle"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-warning-soft">
                      <CalendarClock className="size-4 text-warning" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{job.company}</div>
                      <div className="text-xs text-text-tertiary">
                        {new Date(job.interviewDate!).toLocaleDateString(undefined, {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                      </div>
                    </div>
                    <Badge tone="warning">{countdownLabel(job.interviewDate!)}</Badge>
                  </Link>
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader title="Story library" />
              <div className="px-4 pb-4">
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="text-2xl font-semibold tabular-nums">{stories.length}</span>
                  <Link
                    href="/stories"
                    className="text-[13px] font-medium text-accent-text hover:underline"
                  >
                    Open library
                  </Link>
                </div>
                <Progress value={Math.min(100, stories.length * 12.5)} label="Story coverage" />
                <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">
                  {stories.length >= 8
                    ? "Strong coverage — 8+ stories handle most behavioural interviews."
                    : `${8 - stories.length} more to reach the 8-story bench that covers most behavioural interviews.`}
                </p>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  suffix,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  highlight?: boolean;
}) {
  return (
    <Card className="px-4 py-3.5">
      <div className="flex items-center gap-2 text-text-tertiary">
        {icon}
        <span className="text-[13px] font-medium">{label}</span>
      </div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span
          className={`text-2xl font-semibold tabular-nums tracking-tight ${highlight ? "text-accent-text" : ""}`}
        >
          {value}
        </span>
        {suffix && <span className="text-[13px] text-text-tertiary">{suffix}</span>}
      </div>
    </Card>
  );
}

function buildNextActions({
  jobs,
  stories,
  sessionsCount,
}: {
  jobs: Job[];
  stories: StarStory[];
  sessionsCount: number;
}): Array<{ label: string; href: string }> {
  const actions: Array<{ label: string; href: string }> = [];
  const unanalyzed = jobs.find((j) => !j.analysis);
  if (unanalyzed)
    actions.push({
      label: `Analyze the ${unanalyzed.role} posting at ${unanalyzed.company}`,
      href: `/jobs/${unanalyzed.id}`,
    });
  const noQuestions = jobs.find((j) => j.analysis && j.questions.length === 0);
  if (noQuestions)
    actions.push({
      label: `Generate interview questions for ${noQuestions.company}`,
      href: `/jobs/${noQuestions.id}?tab=questions`,
    });
  if (stories.length < 3)
    actions.push({
      label: "Build your first STAR stories — aim for 3 this week",
      href: "/stories",
    });
  if (sessionsCount === 0 && jobs.some((j) => j.analysis))
    actions.push({
      label: "Run your first mock interview",
      href: `/jobs/${jobs.find((j) => j.analysis)!.id}?tab=mock`,
    });
  const unpracticed = jobs.find((j) => j.questions.some((q) => !q.practiced));
  if (unpracticed)
    actions.push({
      label: `Practice remaining questions for ${unpracticed.company}`,
      href: `/jobs/${unpracticed.id}?tab=questions`,
    });
  if (actions.length === 0)
    actions.push({
      label: "All caught up — add another job or re-run a mock interview",
      href: "/jobs?new=1",
    });
  return actions.slice(0, 5);
}
