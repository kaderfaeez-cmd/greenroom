"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Briefcase, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useGreenroom, readinessScore } from "@/lib/store";
import { useMounted } from "@/hooks/useMounted";
import { STAGES, STAGE_LABELS, type Job, type Stage } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Dialog } from "@/components/ui/Dialog";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { EmptyState, Skeleton } from "@/components/ui/Misc";
import { ScoreRing } from "@/components/ui/Progress";
import { countdownLabel } from "@/lib/utils";

export default function JobsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <JobsBoard />
    </Suspense>
  );
}

function JobsBoard() {
  const mounted = useMounted();
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobs = useGreenroom((s) => s.jobs);
  const stories = useGreenroom((s) => s.stories);
  const sessions = useGreenroom((s) => s.sessions);
  const moveJobStage = useGreenroom((s) => s.moveJobStage);
  const deleteJob = useGreenroom((s) => s.deleteJob);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<Stage | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Job | null>(null);

  // /jobs?new=1 opens the add dialog (used by dashboard + palette).
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setDialogOpen(true);
      router.replace("/jobs", { scroll: false });
    }
  }, [searchParams, router]);

  if (!mounted) {
    return (
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-96 w-64 shrink-0" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Pipeline</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            {jobs.length === 0
              ? "Every application, from wishlist to offer."
              : `${jobs.length} application${jobs.length === 1 ? "" : "s"} · drag cards between stages`}
          </p>
        </div>
        <Button variant="primary" onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" aria-hidden />
          Add job
        </Button>
      </header>

      {jobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No applications yet"
          body="Add a job with its description. Greenroom analyzes it and builds your preparation workspace — questions, mock interviews, the lot."
          action={
            <Button variant="primary" onClick={() => setDialogOpen(true)}>
              <Plus className="size-4" aria-hidden />
              Add your first job
            </Button>
          }
        />
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const inStage = jobs.filter((j) => j.stage === stage);
            return (
              <section
                key={stage}
                aria-label={`${STAGE_LABELS[stage]} column`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(stage);
                }}
                onDragLeave={() => setDragOver((v) => (v === stage ? null : v))}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragId) moveJobStage(dragId, stage);
                  setDragId(null);
                  setDragOver(null);
                }}
                className={`flex w-64 shrink-0 flex-col rounded-xl border transition-colors duration-150 ${
                  dragOver === stage
                    ? "border-accent bg-accent-soft/40"
                    : "border-transparent bg-bg-subtle/60"
                }`}
              >
                <div className="flex items-center justify-between px-3 py-2.5">
                  <span className="text-[13px] font-semibold text-text-secondary">
                    {STAGE_LABELS[stage]}
                  </span>
                  <span className="rounded-md bg-bg-subtle px-1.5 text-xs tabular-nums text-text-tertiary">
                    {inStage.length}
                  </span>
                </div>
                <div className="flex-1 space-y-2 px-2 pb-2">
                  {inStage.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      readiness={readinessScore(job, stories, sessions)}
                      dragging={dragId === job.id}
                      onDragStart={() => setDragId(job.id)}
                      onDragEnd={() => {
                        setDragId(null);
                        setDragOver(null);
                      }}
                      onMove={(dir) => {
                        const idx = STAGES.indexOf(job.stage);
                        const next = STAGES[idx + dir];
                        if (next) moveJobStage(job.id, next);
                      }}
                      onDelete={() => setConfirmDelete(job)}
                    />
                  ))}
                  {inStage.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-text-tertiary">
                      Drop here
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <NewJobDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />

      <Dialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title="Delete this application?"
        description={
          confirmDelete
            ? `${confirmDelete.role} at ${confirmDelete.company} — analysis, questions and mock sessions for it will be removed.`
            : undefined
        }
      >
        <div className="flex justify-end gap-2">
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button
            variant="danger"
            onClick={() => {
              if (confirmDelete) deleteJob(confirmDelete.id);
              setConfirmDelete(null);
            }}
          >
            <Trash2 className="size-4" aria-hidden />
            Delete
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function JobCard({
  job,
  readiness,
  dragging,
  onDragStart,
  onDragEnd,
  onMove,
  onDelete,
}: {
  job: Job;
  readiness: number;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
}) {
  const stageIdx = STAGES.indexOf(job.stage);
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`group rounded-lg border border-border bg-surface p-3 shadow-[var(--shadow-sm)] transition-[opacity,box-shadow,border-color] duration-150 hover:border-border-strong hover:shadow-[var(--shadow-md)] ${
        dragging ? "opacity-40" : ""
      }`}
    >
      <Link href={`/jobs/${job.id}`} className="block">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium leading-snug">{job.role}</div>
            <div className="mt-0.5 truncate text-[13px] text-text-secondary">{job.company}</div>
          </div>
          <ScoreRing value={readiness} size={30} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {job.interviewDate && (
            <Badge tone="warning">{countdownLabel(job.interviewDate)}</Badge>
          )}
          {!job.analysis && <Badge tone="info">Needs analysis</Badge>}
          {job.analysis && job.questions.length === 0 && <Badge>No questions yet</Badge>}
        </div>
      </Link>
      {/* Keyboard/no-drag affordances, revealed on hover or focus */}
      <div className="mt-2 flex items-center justify-between opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100">
        <div className="flex gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            aria-label="Move to previous stage"
            disabled={stageIdx === 0}
            onClick={() => onMove(-1)}
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            aria-label="Move to next stage"
            disabled={stageIdx === STAGES.length - 1}
            onClick={() => onMove(1)}
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-6 text-text-tertiary hover:text-danger"
          aria-label={`Delete ${job.role} at ${job.company}`}
          onClick={onDelete}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

function NewJobDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const addJob = useGreenroom((s) => s.addJob);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (description.trim().length < 40) {
      setError("Paste the full job description — at least a few sentences. That's what powers the analysis.");
      return;
    }
    const job = addJob({
      company: company.trim() || "Unknown company",
      role: role.trim() || "Unknown role",
      descriptionRaw: description.trim(),
    });
    onClose();
    setCompany("");
    setRole("");
    setDescription("");
    setError(null);
    router.push(`/jobs/${job.id}`);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add a job"
      description="Paste the posting — company and role are auto-detected if you leave them blank."
      wide
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="job-company">Company (optional)</Label>
            <Input
              id="job-company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Stripe"
            />
          </div>
          <div>
            <Label htmlFor="job-role">Role (optional)</Label>
            <Input
              id="job-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Frontend Engineer"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="job-description">Job description</Label>
          <Textarea
            id="job-description"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Paste the full job posting here…"
            className="min-h-40"
            aria-invalid={error ? true : undefined}
          />
          {error && <p className="mt-1.5 text-[13px] text-danger">{error}</p>}
        </div>
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit}>
            Create workspace
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
