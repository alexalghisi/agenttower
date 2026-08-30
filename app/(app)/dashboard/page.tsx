import { filtersFromSearch } from "@/lib/analytics/filters";
import { getBreakdowns, getDashboardMetrics, getFilterOptions, getSeries } from "@/lib/analytics/queries";
import { requireAppContext } from "@/lib/auth/app-context";
import { FilterBar } from "@/components/product/filter-bar";
import { MetricChart } from "@/components/product/metric-chart";
import { StatCard } from "@/components/product/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompact, formatNumber, formatUsd } from "@/lib/utils";

export default async function DashboardPage({
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
  const [metrics, series, breakdowns, options] = await Promise.all([
    getDashboardMetrics(membership.organizationId, membership.plan, filters),
    getSeries(membership.organizationId, membership.plan, filters),
    getBreakdowns(membership.organizationId, membership.plan, filters),
    getFilterOptions(membership.organizationId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Operations</h1>
          <p className="text-sm text-muted-foreground">Live metrics from ingested and seeded runs. Retention follows the {membership.plan} plan.</p>
        </div>
        <FilterBar projects={options.projects} agents={options.agents} models={options.models} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total runs" value={formatNumber(metrics.runs)} />
        <StatCard label="Success rate" value={`${metrics.successRate.toFixed(1)}%`} />
        <StatCard label="Failed runs" value={formatNumber(metrics.failures)} />
        <StatCard label="Total cost" value={formatUsd(metrics.cost, 2)} />
        <StatCard label="Average latency" value={`${Math.round(metrics.latency)}ms`} />
        <StatCard label="Tokens used" value={formatCompact(metrics.tokens)} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Runs over time</CardTitle></CardHeader>
          <CardContent><MetricChart data={series} y="runs" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Cost over time</CardTitle></CardHeader>
          <CardContent><MetricChart data={series} y="cost" color="#f59e0b" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Success vs failures</CardTitle></CardHeader>
          <CardContent><MetricChart data={series} kind="bar" y="failures" color="#fb7185" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Latency trend</CardTitle></CardHeader>
          <CardContent><MetricChart data={series} kind="line" y="latency" color="#60a5fa" /></CardContent>
        </Card>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Cost by model</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {breakdowns.byModel.slice(0, 6).map((row) => (
              <div key={row.key} className="flex justify-between">
                <span>{row.key}</span>
                <span className="text-muted-foreground">{formatUsd(row.cost)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Runs by agent</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {breakdowns.byAgent.slice(0, 6).map((row) => (
              <div key={row.id} className="flex justify-between">
                <span>{row.key}</span>
                <span className="text-muted-foreground">{formatNumber(row.runs)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
