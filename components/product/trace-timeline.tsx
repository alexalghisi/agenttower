"use client";

import { useState } from "react";
import { ChevronDown, Cpu, Wrench } from "lucide-react";
import { StatusBadge } from "@/components/product/status-badge";
import { JSONViewer } from "@/components/product/json-viewer";
import { formatDuration } from "@/lib/utils";

export type TimelineStep = {
  id: string;
  name: string;
  stepType: string;
  status: string;
  durationMs: number | null;
  input: unknown;
  output: unknown;
};

export function TraceTimeline({ steps }: { steps: TimelineStep[] }) {
  const [open, setOpen] = useState<string | null>(steps[0]?.id ?? null);
  const max = Math.max(...steps.map((step) => step.durationMs ?? 1), 1);

  return (
    <div className="space-y-2">
      {steps.map((step) => {
        const expanded = open === step.id;
        return (
          <div key={step.id} className="rounded-xl border border-border bg-card">
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-3 text-left"
              onClick={() => setOpen(expanded ? null : step.id)}
            >
              {step.stepType === "tool" ? <Wrench className="size-4 text-amber-500" /> : <Cpu className="size-4 text-teal-500" />}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{step.name}</p>
                  <StatusBadge status={step.status} />
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.max(8, ((step.durationMs ?? 0) / max) * 100)}%` }}
                  />
                </div>
              </div>
              <span className="text-xs text-muted-foreground">{formatDuration(step.durationMs ?? 0)}</span>
              <ChevronDown className={`size-4 transition ${expanded ? "rotate-180" : ""}`} />
            </button>
            {expanded ? (
              <div className="grid gap-3 border-t border-border p-4 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">Input</p>
                  <JSONViewer value={step.input} />
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">Output</p>
                  <JSONViewer value={step.output} />
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
