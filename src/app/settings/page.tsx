"use client";

import { useRef, useState } from "react";
import { Download, KeyRound, Trash2, Upload } from "lucide-react";
import { useGreenroom } from "@/lib/store";
import { useMounted } from "@/hooks/useMounted";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Skeleton } from "@/components/ui/Misc";

export default function SettingsPage() {
  const mounted = useMounted();
  const jobs = useGreenroom((s) => s.jobs);
  const stories = useGreenroom((s) => s.stories);
  const sessions = useGreenroom((s) => s.sessions);
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  if (!mounted) return <Skeleton className="h-96" />;

  const exportAll = () => {
    const raw = localStorage.getItem("greenroom-v1") ?? "{}";
    const blob = new Blob([raw], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `greenroom-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importAll = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result);
        const parsed = JSON.parse(text);
        if (!parsed?.state || typeof parsed.state !== "object") {
          throw new Error("Not a Greenroom backup file");
        }
        localStorage.setItem("greenroom-v1", text);
        setImportMessage("Backup restored — reloading…");
        setTimeout(() => window.location.reload(), 800);
      } catch {
        setImportMessage("That file isn't a valid Greenroom backup.");
      }
    };
    reader.readAsText(file);
  };

  const wipe = () => {
    localStorage.removeItem("greenroom-v1");
    window.location.reload();
  };

  return (
    <div className="max-w-2xl space-y-5">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-0.5 text-sm text-text-secondary">
          Greenroom is local-first — everything lives in this browser. Nothing is uploaded
          anywhere except the text you explicitly send for AI analysis.
        </p>
      </header>

      <Card>
        <CardHeader title="AI engine" />
        <div className="space-y-3 px-4 pb-4 text-sm leading-relaxed text-text-secondary">
          <p className="flex items-start gap-2">
            <KeyRound className="mt-0.5 size-4 shrink-0 text-text-tertiary" aria-hidden />
            <span>
              Deep analysis runs on Google Gemini via a free API key. Without a key, Greenroom
              falls back to its built-in quick engine — still useful, less deep. To enable the
              full engine, set <code className="rounded bg-bg-subtle px-1 py-0.5 font-mono text-[13px]">GEMINI_API_KEY</code> in
              the deployment environment (get a free key at{" "}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-accent-text underline"
              >
                aistudio.google.com/apikey
              </a>
              ).
            </span>
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader title="Your data" />
        <div className="space-y-4 px-4 pb-4">
          <div className="flex flex-wrap gap-6 text-sm text-text-secondary">
            <span>
              <strong className="font-semibold text-text tabular-nums">{jobs.length}</strong> jobs
            </span>
            <span>
              <strong className="font-semibold text-text tabular-nums">{stories.length}</strong>{" "}
              stories
            </span>
            <span>
              <strong className="font-semibold text-text tabular-nums">{sessions.length}</strong>{" "}
              mock sessions
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={exportAll}>
              <Download className="size-4" aria-hidden />
              Export backup
            </Button>
            <Button onClick={() => fileRef.current?.click()}>
              <Upload className="size-4" aria-hidden />
              Import backup
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importAll(f);
                e.target.value = "";
              }}
            />
          </div>
          {importMessage && <p className="text-[13px] text-text-secondary">{importMessage}</p>}
        </div>
      </Card>

      <Card className="border-danger/30">
        <CardHeader title="Danger zone" />
        <div className="flex items-center justify-between gap-4 px-4 pb-4">
          <p className="text-[13px] leading-relaxed text-text-secondary">
            Delete every job, story, and session from this browser. Export a backup first —
            there is no undo.
          </p>
          <Button variant="danger" onClick={() => setConfirmWipe(true)}>
            <Trash2 className="size-4" aria-hidden />
            Erase all data
          </Button>
        </div>
      </Card>

      <Dialog
        open={confirmWipe}
        onClose={() => setConfirmWipe(false)}
        title="Erase everything?"
        description="All jobs, analyses, questions, mock sessions and stories in this browser will be permanently deleted."
      >
        <div className="flex justify-end gap-2">
          <Button onClick={() => setConfirmWipe(false)}>Cancel</Button>
          <Button variant="danger" onClick={wipe}>
            Yes, erase it all
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
