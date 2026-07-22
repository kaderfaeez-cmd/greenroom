"use client";

import { useState } from "react";
import { StickyNote, Trash2 } from "lucide-react";
import type { Job } from "@/lib/types";
import { useGreenroom } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/Misc";

export function NotesPanel({ job }: { job: Job }) {
  const addNote = useGreenroom((s) => s.addNote);
  const deleteNote = useGreenroom((s) => s.deleteNote);
  const [draft, setDraft] = useState("");

  const submit = () => {
    if (draft.trim().length === 0) return;
    addNote(job.id, draft.trim());
    setDraft("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Recruiter name, salary discussed, follow-up dates, gut feel after the call… (⌘⏎ to save)"
          className="min-h-20"
          aria-label="New note"
        />
        <Button variant="primary" className="mb-0.5" onClick={submit} disabled={draft.trim().length === 0}>
          Save
        </Button>
      </div>

      {job.notes.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          title="No notes yet"
          body="Everything you learn about this application lives here — recruiter details, salary numbers mentioned, impressions after each round."
        />
      ) : (
        <ul className="space-y-2">
          {job.notes.map((note) => (
            <li
              key={note.id}
              className="group flex items-start justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3"
            >
              <div className="min-w-0">
                <p className="whitespace-pre-line text-sm leading-relaxed">{note.text}</p>
                <span className="mt-1.5 block text-xs text-text-tertiary">
                  {new Date(note.createdAt).toLocaleString(undefined, {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
                aria-label="Delete note"
                onClick={() => deleteNote(job.id, note.id)}
              >
                <Trash2 className="size-4 text-text-tertiary hover:text-danger" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
