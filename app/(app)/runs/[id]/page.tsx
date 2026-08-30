import { notFound } from "next/navigation";
import { getRunDetail } from "@/lib/analytics/queries";
import { requireAppContext } from "@/lib/auth/app-context";
import { JSONViewer } from "@/components/product/json-viewer";
import { StatusBadge } from "@/components/product/status-badge";
import { TraceTimeline } from "@/components/product/trace-timeline";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDuration, formatUsd } from "@/lib/utils";

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { membership } = await requireAppContext();
  const detail = await getRunDetail(membership.organizationId, id);
  if (!detail) notFound();
  const { run } = detail;

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs text-muted-foreground">{run.traceId}</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{detail.agentName}</h1>
          <StatusBadge status={run.status} />
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span>{run.model}</span>
          <span>{formatDuration(run.durationMs ?? 0)}</span>
          <span>{run.totalTokens} tokens</span>
          <span>{formatUsd(Number(run.estimatedCost), 4)}</span>
          <span>{run.environment}</span>
          <span>{detail.projectName}</span>
        </div>
      </div>
      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="raw">Raw data</TabsTrigger>
          <TabsTrigger value="tokens">Tokens</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
        </TabsList>
        <TabsContent value="timeline">
          <TraceTimeline
            steps={detail.steps.map((step) => ({
              id: step.id,
              name: step.name,
              stepType: step.stepType,
              status: step.status,
              durationMs: step.durationMs,
              input: step.input,
              output: step.output,
            }))}
          />
        </TabsContent>
        <TabsContent value="raw">
          <JSONViewer value={detail} />
        </TabsContent>
        <TabsContent value="tokens">
          <div className="space-y-3">
            {detail.llms.map((call) => (
              <div key={call.id} className="rounded-xl border border-border p-4 text-sm">
                <p className="font-medium">{call.model}</p>
                <p className="text-muted-foreground">
                  {call.inputTokens} in / {call.outputTokens} out · {formatUsd(Number(call.cost), 4)} · {call.latencyMs}ms
                </p>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="errors">
          {run.errorId ? (
            <p className="text-sm">This run is attached to error group {run.errorId}.</p>
          ) : (
            <p className="text-sm text-muted-foreground">No error group on this run.</p>
          )}
        </TabsContent>
        <TabsContent value="metadata">
          <JSONViewer value={run.metadata} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
