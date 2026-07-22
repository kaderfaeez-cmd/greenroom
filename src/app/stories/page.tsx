"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BookOpenText, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import type { StarStory } from "@/lib/types";
import { useGreenroom } from "@/lib/store";
import { useMounted } from "@/hooks/useMounted";
import { callAi } from "@/lib/ai/client";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Dialog } from "@/components/ui/Dialog";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { EmptyState, Skeleton } from "@/components/ui/Misc";

const COMPETENCIES = [
  "Leadership",
  "Conflict resolution",
  "Delivery under pressure",
  "Failure & learning",
  "Initiative",
  "Teamwork",
  "Customer focus",
  "Technical judgement",
];

interface StoryDraft {
  id: string | null;
  title: string;
  competency: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  tags: string;
}

const emptyDraft = (): StoryDraft => ({
  id: null,
  title: "",
  competency: COMPETENCIES[0],
  situation: "",
  task: "",
  action: "",
  result: "",
  tags: "",
});

export default function StoriesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <Stories />
    </Suspense>
  );
}

function Stories() {
  const mounted = useMounted();
  const searchParams = useSearchParams();
  const stories = useGreenroom((s) => s.stories);
  const addStory = useGreenroom((s) => s.addStory);
  const updateStory = useGreenroom((s) => s.updateStory);
  const deleteStory = useGreenroom((s) => s.deleteStory);

  const [draft, setDraft] = useState<StoryDraft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<StarStory | null>(null);
  const [aiNotes, setAiNotes] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const focusRef = useRef<HTMLDivElement>(null);

  // /stories?focus=<id> scrolls that story into view (palette deep-link).
  const focusId = searchParams.get("focus");
  useEffect(() => {
    if (focusId && mounted) {
      focusRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [focusId, mounted]);

  if (!mounted) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  const openNew = () => {
    setAiNotes("");
    setAiError(null);
    setDraft(emptyDraft());
  };

  const openEdit = (story: StarStory) => {
    setAiNotes("");
    setAiError(null);
    setDraft({
      id: story.id,
      title: story.title,
      competency: story.competency,
      situation: story.situation,
      task: story.task,
      action: story.action,
      result: story.result,
      tags: story.tags.join(", "),
    });
  };

  const save = () => {
    if (!draft) return;
    const payload = {
      title: draft.title.trim() || "Untitled story",
      competency: draft.competency,
      situation: draft.situation.trim(),
      task: draft.task.trim(),
      action: draft.action.trim(),
      result: draft.result.trim(),
      tags: draft.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };
    if (draft.id) {
      updateStory(draft.id, payload);
    } else {
      addStory(payload);
    }
    setDraft(null);
  };

  const draftFromAi = async () => {
    if (!draft) return;
    setAiLoading(true);
    setAiError(null);
    const result = await callAi<{
      title: string;
      situation: string;
      task: string;
      action: string;
      result: string;
      tags: string[];
    }>("star-suggest", { competency: draft.competency, roughNotes: aiNotes });
    setAiLoading(false);
    if (result.ok && result.data) {
      setDraft({
        ...draft,
        title: result.data.title,
        situation: result.data.situation,
        task: result.data.task,
        action: result.data.action,
        result: result.data.result,
        tags: result.data.tags.join(", "),
      });
    } else {
      setAiError(result.error ?? "Drafting failed — structure it manually below");
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">STAR stories</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            Your bench of real examples. Eight strong stories cover almost every behavioural
            interview.
          </p>
        </div>
        <Button variant="primary" onClick={openNew}>
          <Plus className="size-4" aria-hidden />
          New story
        </Button>
      </header>

      {stories.length === 0 ? (
        <EmptyState
          icon={BookOpenText}
          title="No stories yet"
          body="Start with your best project. Write rough notes about what happened — the AI coach structures them into a tight STAR story you then own."
          action={
            <Button variant="primary" onClick={openNew}>
              <Plus className="size-4" aria-hidden />
              Build your first story
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {stories.map((story) => (
            <article
              key={story.id}
              ref={story.id === focusId ? focusRef : undefined}
              className={`group rounded-xl border bg-surface p-4 transition-[border-color,box-shadow] duration-150 hover:border-border-strong hover:shadow-[var(--shadow-md)] ${
                story.id === focusId ? "border-accent" : "border-border"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-sm font-semibold leading-snug">{story.title}</h2>
                <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    aria-label={`Edit ${story.title}`}
                    onClick={() => openEdit(story)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 hover:text-danger"
                    aria-label={`Delete ${story.title}`}
                    onClick={() => setConfirmDelete(story)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <Badge tone="accent">{story.competency}</Badge>
                {story.tags.map((t) => (
                  <Badge key={t}>{t}</Badge>
                ))}
              </div>
              <dl className="mt-3 space-y-2 text-[13px] leading-relaxed">
                <StarRow label="S" text={story.situation} />
                <StarRow label="T" text={story.task} />
                <StarRow label="A" text={story.action} />
                <StarRow label="R" text={story.result} highlight />
              </dl>
            </article>
          ))}
        </div>
      )}

      {/* Editor dialog */}
      <Dialog
        open={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.id ? "Edit story" : "New STAR story"}
        description="Keep it true, keep it tight — 60–90 seconds when spoken."
        wide
      >
        {draft && (
          <div className="space-y-4">
            {!draft.id && (
              <div className="rounded-lg border border-dashed border-border bg-bg-subtle/50 p-3">
                <Label htmlFor="ai-notes">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-accent-text" aria-hidden />
                    Draft with AI — describe what happened in your own words
                  </span>
                </Label>
                <Textarea
                  id="ai-notes"
                  value={aiNotes}
                  onChange={(e) => setAiNotes(e.target.value)}
                  placeholder="e.g. Client kept changing scope on the recipe platform, deadline was fixed, I proposed cutting to the core QR flow and shipped on time…"
                  className="min-h-20"
                />
                <div className="mt-2 flex items-center gap-3">
                  <Button
                    size="sm"
                    onClick={draftFromAi}
                    loading={aiLoading}
                    disabled={aiNotes.trim().length < 20}
                  >
                    Structure my notes
                  </Button>
                  {aiError && <p className="text-[13px] text-danger">{aiError}</p>}
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="story-title">Title</Label>
                <Input
                  id="story-title"
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="Shipped the launch under a fixed deadline"
                />
              </div>
              <div>
                <Label htmlFor="story-competency">Competency</Label>
                <select
                  id="story-competency"
                  value={draft.competency}
                  onChange={(e) => setDraft({ ...draft, competency: e.target.value })}
                  className="h-9 w-full rounded-lg border border-border bg-surface px-2.5 text-sm text-text transition-colors hover:border-border-strong focus:border-accent focus:outline-none"
                >
                  {COMPETENCIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {(
              [
                ["situation", "Situation — the context, 1-2 sentences"],
                ["task", "Task — what YOU had to achieve"],
                ["action", "Action — what you did, \"I\" statements"],
                ["result", "Result — the outcome, with numbers if possible"],
              ] as const
            ).map(([field, label]) => (
              <div key={field}>
                <Label htmlFor={`story-${field}`}>{label}</Label>
                <Textarea
                  id={`story-${field}`}
                  value={draft[field]}
                  onChange={(e) => setDraft({ ...draft, [field]: e.target.value })}
                  className="min-h-16"
                />
              </div>
            ))}

            <div>
              <Label htmlFor="story-tags">Tags (comma separated)</Label>
              <Input
                id="story-tags"
                value={draft.tags}
                onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
                placeholder="deadline, client work, scope management"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button onClick={() => setDraft(null)}>Cancel</Button>
              <Button variant="primary" onClick={save}>
                {draft.id ? "Save changes" : "Add to library"}
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Delete confirm */}
      <Dialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title="Delete this story?"
        description={confirmDelete ? `"${confirmDelete.title}" will be removed from your library.` : undefined}
      >
        <div className="flex justify-end gap-2">
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button
            variant="danger"
            onClick={() => {
              if (confirmDelete) deleteStory(confirmDelete.id);
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

function StarRow({
  label,
  text,
  highlight = false,
}: {
  label: string;
  text: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex gap-2.5">
      <dt
        className={`flex size-5 shrink-0 items-center justify-center rounded font-mono text-[11px] font-bold ${
          highlight ? "bg-accent-soft text-accent-text" : "bg-bg-subtle text-text-tertiary"
        }`}
      >
        {label}
      </dt>
      <dd className="text-text-secondary">{text || <em className="text-text-tertiary">Not written yet</em>}</dd>
    </div>
  );
}
