"use client";

import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  BookOpenText,
  Briefcase,
  KanbanSquare,
  LayoutDashboard,
  Plus,
  Settings,
} from "lucide-react";
import { useGreenroom } from "@/lib/store";
import { useCommandPalette } from "@/components/shell/CommandPaletteContext";
import { STAGE_LABELS } from "@/lib/types";

export function CommandPalette() {
  const { isOpen, close } = useCommandPalette();
  const router = useRouter();
  const jobs = useGreenroom((s) => s.jobs);
  const stories = useGreenroom((s) => s.stories);

  const go = (href: string) => {
    close();
    router.push(href);
  };

  return (
    <Command.Dialog
      open={isOpen}
      onOpenChange={(v) => !v && close()}
      label="Global search"
      className="fixed left-1/2 top-[16vh] z-[60] w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-surface-raised shadow-[var(--shadow-lg)]"
    >
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={close}
        className="fixed inset-0 -z-10 bg-black/40"
        style={{ position: "fixed", inset: "-100vh -100vw" }}
      />
      <Command.Input
        placeholder="Search jobs, stories, pages…"
        className="h-12 w-full border-b border-border bg-transparent px-4 text-sm text-text placeholder:text-text-tertiary focus:outline-none"
      />
      <Command.List className="max-h-72 overflow-y-auto p-1.5">
        <Command.Empty className="px-3 py-8 text-center text-sm text-text-tertiary">
          Nothing found.
        </Command.Empty>

        <Command.Group
          heading="Go to"
          className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:text-text-tertiary"
        >
          <PaletteItem onSelect={() => go("/")} icon={<LayoutDashboard className="size-4" />}>
            Dashboard
          </PaletteItem>
          <PaletteItem onSelect={() => go("/jobs")} icon={<KanbanSquare className="size-4" />}>
            Pipeline
          </PaletteItem>
          <PaletteItem onSelect={() => go("/stories")} icon={<BookOpenText className="size-4" />}>
            STAR stories
          </PaletteItem>
          <PaletteItem onSelect={() => go("/settings")} icon={<Settings className="size-4" />}>
            Settings
          </PaletteItem>
          <PaletteItem onSelect={() => go("/jobs?new=1")} icon={<Plus className="size-4" />}>
            Add job…
          </PaletteItem>
        </Command.Group>

        {jobs.length > 0 && (
          <Command.Group
            heading="Jobs"
            className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:text-text-tertiary"
          >
            {jobs.map((job) => (
              <PaletteItem
                key={job.id}
                onSelect={() => go(`/jobs/${job.id}`)}
                icon={<Briefcase className="size-4" />}
                hint={STAGE_LABELS[job.stage]}
              >
                {job.role} · {job.company}
              </PaletteItem>
            ))}
          </Command.Group>
        )}

        {stories.length > 0 && (
          <Command.Group
            heading="STAR stories"
            className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:text-text-tertiary"
          >
            {stories.map((story) => (
              <PaletteItem
                key={story.id}
                onSelect={() => go(`/stories?focus=${story.id}`)}
                icon={<BookOpenText className="size-4" />}
                hint={story.competency}
              >
                {story.title}
              </PaletteItem>
            ))}
          </Command.Group>
        )}
      </Command.List>
    </Command.Dialog>
  );
}

function PaletteItem({
  children,
  icon,
  hint,
  onSelect,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  hint?: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-sm text-text-secondary data-[selected=true]:bg-bg-subtle data-[selected=true]:text-text"
    >
      <span className="text-text-tertiary">{icon}</span>
      <span className="flex-1 truncate">{children}</span>
      {hint && <span className="text-xs text-text-tertiary">{hint}</span>}
    </Command.Item>
  );
}
