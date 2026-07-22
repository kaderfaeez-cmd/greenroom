"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenText,
  KanbanSquare,
  LayoutDashboard,
  Search,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Kbd } from "@/components/ui/Misc";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { useCommandPalette } from "@/components/shell/CommandPaletteContext";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Pipeline", icon: KanbanSquare },
  { href: "/stories", label: "STAR stories", icon: BookOpenText },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { open } = useCommandPalette();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-border bg-bg md:flex">
      <div className="flex h-14 items-center gap-2 px-4">
        {/* Wordmark — curtain mark */}
        <div className="flex size-6 items-center justify-center rounded-md bg-accent">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path
              d="M2 1v10M6 1v10M10 1v10"
              stroke="var(--on-accent)"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <span className="text-[15px] font-semibold tracking-tight">Greenroom</span>
      </div>

      <button
        onClick={open}
        className="mx-3 mb-4 flex h-8 items-center gap-2 rounded-lg border border-border bg-surface px-2.5 text-[13px] text-text-tertiary transition-colors hover:border-border-strong hover:text-text-secondary"
      >
        <Search className="size-3.5" aria-hidden />
        <span className="flex-1 text-left">Search…</span>
        <Kbd>⌘K</Kbd>
      </button>

      <nav className="flex-1 space-y-0.5 px-3" aria-label="Main navigation">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-colors duration-150",
                active
                  ? "bg-accent-soft text-accent-text"
                  : "text-text-secondary hover:bg-bg-subtle hover:text-text",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center justify-between border-t border-border px-4 py-3">
        <span className="text-xs text-text-tertiary">Local-first · your data stays here</span>
        <ThemeToggle />
      </div>
    </aside>
  );
}

/** Compact top bar for mobile viewports. */
export function MobileBar() {
  const pathname = usePathname();
  return (
    <div className="sticky top-0 z-40 flex h-12 items-center justify-between border-b border-border bg-bg/90 px-3 backdrop-blur md:hidden">
      <div className="flex items-center gap-2">
        <div className="flex size-5 items-center justify-center rounded bg-accent">
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path
              d="M2 1v10M6 1v10M10 1v10"
              stroke="var(--on-accent)"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <span className="text-sm font-semibold">Greenroom</span>
      </div>
      <nav className="flex items-center gap-1" aria-label="Main navigation">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex size-8 items-center justify-center rounded-lg",
                active ? "bg-accent-soft text-accent-text" : "text-text-tertiary",
              )}
            >
              <Icon className="size-4" />
            </Link>
          );
        })}
        <ThemeToggle />
      </nav>
    </div>
  );
}
