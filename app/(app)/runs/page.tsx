import Link from "next/link";
import { filtersFromSearch } from "@/lib/analytics/filters";
import { getFilterOptions, listRuns } from "@/lib/analytics/queries";
import { requireAppContext } from "@/lib/auth/app-context";
import { FilterBar } from "@/components/product/filter-bar";
import { StatusBadge } from "@/components/product/status-badge";
import { EmptyState } from "@/components/product/empty-state";
import { formatDuration, formatRelative, formatUsd } from "@/lib/utils";

export default async function RunsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { membership } = await requireAppContext();
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") params.set(key, value);
  }
  const filters = filtersFromSearch(params);
  const page = Number(params.get("page") ?? "0");
  const [result, options] = await Promise.all([
    listRuns(membership.organizationId, membership.plan, filters, page),
    getFilterOptions(membership.organizationId),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Run explorer</h1>
        <p className="text-sm text-muted-foreground">{result.total} traces in the current window.</p>
      </div>
      <FilterBar projects={options.projects} agents={options.agents} models={options.models} showSearch />
      {result.rows.length === 0 ? (
        <EmptyState title="No runs match these filters" description="Ingest a trace or widen the date range." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-secondary/60 text-xs text-muted-foreground">
              <tr>
                {["Timestamp", "Agent", "Status", "Duration", "Model", "Tokens", "Cost", "Env"].map((col) => (
                  <th key={col} className="px-3 py-2 font-medium">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row) => (
                <tr key={row.id} className="border-t border-border hover:bg-secondary/40">
                  <td className="px-3 py-2">
                    <Link href={`/runs/${row.id}`} className="font-medium hover:underline">
                      {formatRelative(row.startedAt)}
                    </Link>
                    <p className="font-mono text-[11px] text-muted-foreground">{row.traceId}</p>
                  </td>
                  <td className="px-3 py-2">{row.agentName}</td>
                  <td className="px-3 py-2"><StatusBadge status={row.status} /></td>
                  <td className="px-3 py-2">{formatDuration(row.durationMs ?? 0)}</td>
                  <td className="px-3 py-2">{row.model}</td>
                  <td className="px-3 py-2">{row.totalTokens}</td>
                  <td className="px-3 py-2">{formatUsd(row.estimatedCost, 4)}</td>
                  <td className="px-3 py-2">{row.environment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
