import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-bg-subtle px-1 font-mono text-[11px] text-text-tertiary">
      {children}
    </kbd>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-12 text-center",
        className,
      )}
    >
      <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-bg-subtle">
        <Icon className="size-5 text-text-tertiary" aria-hidden />
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-text-secondary">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-bg-subtle", className)}
    />
  );
}

/** Inline engine tag: shows whether a result came from full AI or quick engine. */
export function EngineTag({ engine }: { engine: "ai" | "quick" | undefined }) {
  if (!engine) return null;
  return (
    <span
      className="rounded-md bg-bg-subtle px-1.5 py-0.5 text-[11px] font-medium text-text-tertiary"
      title={
        engine === "ai"
          ? "Generated with the full AI engine"
          : "Quick analysis (no API key configured) — add a free Gemini key in Settings for deeper results"
      }
    >
      {engine === "ai" ? "AI engine" : "Quick engine"}
    </span>
  );
}
