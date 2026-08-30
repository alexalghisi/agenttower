import { notFound } from "next/navigation";
import { filtersFromSearch } from "@/lib/analytics/filters";
import { getBreakdowns, getDashboardMetrics, getSeries } from "@/lib/analytics/queries";
import { requireAppContext } from "@/lib/auth/app-context";
import { MetricChart } from "@/components/product/metric-chart";
import { StatCard } from "@/components/product/stat-card";
import { formatCompact, formatNumber, formatUsd, percentageDelta, rangeFromPreset } from "@/lib/utils";

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { membership } = await requireAppContext();
  const current = filtersFromSearch(new URLSearchParams("range=7d"));
  current.agentId = id;
  const previousRange = rangeFromPreset("7d");
  const previous = {
    ...current,
    from: new Date(previousRange.from.getTime() - 7 * 24 * 60 * 60 * 1000),
    to: previousRange.from,
  };

  const [metrics, prior, series, breakdowns] = await Promise.all([
    getDashboardMetrics(membership.organizationId, membership.plan, current),
    getDashboardMetrics(membership.organizationId, membership.plan, previous),
    getSeries(membership.organizationId, membership.plan, current),
    getBreakdowns(membership.organizationId, membership.plan, current),
  ]);
  const agent = breakdowns.byAgent[0];
  if (!agent) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{agent.key}</h1>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Runs" value={formatNumber(metrics.runs)} delta={percentageDelta(metrics.runs, prior.runs)} />
        <StatCard label="Success rate" value={`${metrics.successRate.toFixed(1)}%`} delta={percentageDelta(metrics.successRate, prior.successRate)} />
        <StatCard label="Failures" value={formatNumber(metrics.failures)} />
        <StatCard label="Cost" value={formatUsd(metrics.cost)} delta={percentageDelta(metrics.cost, prior.cost)} />
        <StatCard label="Tokens" value={formatCompact(metrics.tokens)} />
        <StatCard
          label="Cost / successful run"
          value={formatUsd(metrics.successes ? metrics.cost / metrics.successes : 0, 4)}
        />
      </div>
      <MetricChart data={series} y="runs" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border p-4">
          <h2 className="text-sm font-semibold">Model distribution</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {breakdowns.byModel.map((row) => (
              <li key={row.key} className="flex justify-between">
                <span>{row.key}</span>
                <span className="text-muted-foreground">{row.runs}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-border p-4">
          <h2 className="text-sm font-semibold">Average latency</h2>
          <p className="mt-3 text-3xl font-semibold">{Math.round(metrics.latency)}ms</p>
        </div>
      </div>
    </div>
  );
}
