import Link from "next/link";
import { filtersFromSearch } from "@/lib/analytics/filters";
import { getBreakdowns } from "@/lib/analytics/queries";
import { requireAppContext } from "@/lib/auth/app-context";
import { formatNumber, formatUsd } from "@/lib/utils";

export default async function AgentsPage({
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
  const { byAgent } = await getBreakdowns(membership.organizationId, membership.plan, filtersFromSearch(params));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Agents</h1>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-secondary/60 text-xs text-muted-foreground">
            <tr>
              {["Agent", "Runs", "Success", "Cost", "Latency"].map((col) => (
                <th key={col} className="px-3 py-2 font-medium">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {byAgent.map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className="px-3 py-2">
                  <Link href={`/agents/${row.id}`} className="hover:underline">{row.key}</Link>
                </td>
                <td className="px-3 py-2">{formatNumber(row.runs)}</td>
                <td className="px-3 py-2">{row.successRate.toFixed(1)}%</td>
                <td className="px-3 py-2">{formatUsd(row.cost)}</td>
                <td className="px-3 py-2">{Math.round(row.latency)}ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
