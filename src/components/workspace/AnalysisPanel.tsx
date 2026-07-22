"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Eye,
  FileSearch,
  Landmark,
  ListChecks,
  RefreshCw,
  Route,
} from "lucide-react";
import type { Job } from "@/lib/types";
import { useGreenroom } from "@/lib/store";
import { callAi } from "@/lib/ai/client";
import type { JobAnalysis } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState, EngineTag, Skeleton } from "@/components/ui/Misc";

export function AnalysisPanel({ job }: { job: Job }) {
  const setAnalysis = useGreenroom((s) => s.setAnalysis);
  const recordActivity = useGreenroom((s) => s.recordActivity);
  const [loading, setLoading] = useState(false);
  const [engine, setEngine] = useState<"ai" | "quick" | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const analyze = async () => {
    setLoading(true);
    setError(null);
    const result = await callAi<JobAnalysis>("analyze", {
      description: job.descriptionRaw,
    });
    setLoading(false);
    if (result.ok && result.data) {
      setAnalysis(job.id, result.data);
      setEngine(result.engine);
      recordActivity();
    } else {
      setError(result.error ?? "Analysis failed — try again");
    }
  };

  if (!job.analysis && loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <RefreshCw className="size-4 animate-spin" aria-hidden />
          Reading the posting like a recruiter would…
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  if (!job.analysis) {
    return (
      <EmptyState
        icon={FileSearch}
        title="Not analyzed yet"
        body="Greenroom reads the posting like a senior recruiter: required vs nice-to-have, hidden expectations, likely interview stages, red flags."
        action={
          <div className="flex flex-col items-center gap-2">
            <Button variant="primary" onClick={analyze} loading={loading}>
              Analyze this job
            </Button>
            {error && <p className="text-[13px] text-danger">{error}</p>}
          </div>
        }
      />
    );
  }

  const a = job.analysis;

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="max-w-2xl text-sm leading-relaxed">{a.summary}</p>
          <div className="flex items-center gap-2">
            <EngineTag engine={engine} />
            <Button size="sm" onClick={analyze} loading={loading} aria-label="Re-analyze">
              <RefreshCw className="size-3.5" aria-hidden />
              Re-run
            </Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge tone="accent">{a.seniority}</Badge>
          <Badge>{a.location}</Badge>
          {a.salary && <Badge tone="success">{a.salary}</Badge>}
        </div>
        {error && <p className="mt-2 text-[13px] text-danger">{error}</p>}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="Required skills" />
          <ListBlock items={a.requiredSkills} icon={<ListChecks className="size-3.5" />} />
        </Card>

        <Card>
          <CardHeader title="Technologies" />
          <div className="flex flex-wrap gap-1.5 px-4 pb-4">
            {a.technologies.length > 0 ? (
              a.technologies.map((t) => <Badge key={t}>{t}</Badge>)
            ) : (
              <p className="text-[13px] text-text-tertiary">No specific technologies detected.</p>
            )}
          </div>
          {a.preferredSkills.length > 0 && (
            <>
              <CardHeader title="Nice to have" />
              <ListBlock items={a.preferredSkills} icon={<ListChecks className="size-3.5" />} />
            </>
          )}
        </Card>

        <Card>
          <CardHeader title="Hidden expectations" />
          <ListBlock
            items={a.hiddenExpectations}
            icon={<Eye className="size-3.5" />}
            tone="text-info"
          />
        </Card>

        <Card>
          <CardHeader title="Likely interview stages" />
          <ol className="space-y-2 px-4 pb-4">
            {a.likelyStages.map((stage, i) => (
              <li key={stage} className="flex gap-2.5 text-sm leading-relaxed">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-text">
                  {i + 1}
                </span>
                {stage}
              </li>
            ))}
          </ol>
        </Card>

        <Card>
          <CardHeader title="Culture signals" />
          <ListBlock
            items={a.cultureSignals}
            icon={<Landmark className="size-3.5" />}
            fallbackText="No strong culture signals in the posting — worth asking about directly."
          />
        </Card>

        <Card>
          <CardHeader title="Red flags" />
          <ListBlock
            items={a.redFlags}
            icon={<AlertTriangle className="size-3.5" />}
            tone="text-warning"
            fallbackText="Nothing alarming detected. Still verify workload and team health in the interview."
          />
        </Card>
      </div>

      {a.responsibilities.length > 0 && (
        <Card>
          <CardHeader title="Core responsibilities" />
          <ListBlock items={a.responsibilities} icon={<Route className="size-3.5" />} />
        </Card>
      )}

      <Card>
        <CardHeader title="ATS keywords — mirror these in your CV" />
        <div className="flex flex-wrap gap-1.5 px-4 pb-4">
          {a.atsKeywords.map((k) => (
            <Badge key={k} tone="accent">
              {k}
            </Badge>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ListBlock({
  items,
  icon,
  tone = "text-text-tertiary",
  fallbackText,
}: {
  items: string[];
  icon: React.ReactNode;
  tone?: string;
  fallbackText?: string;
}) {
  if (items.length === 0) {
    return (
      <p className="px-4 pb-4 text-[13px] text-text-tertiary">
        {fallbackText ?? "Nothing detected."}
      </p>
    );
  }
  return (
    <ul className="space-y-2 px-4 pb-4">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5 text-sm leading-relaxed">
          <span className={`mt-1 shrink-0 ${tone}`}>{icon}</span>
          {item}
        </li>
      ))}
    </ul>
  );
}
