import { filtersFromSearch } from "@/lib/analytics/filters";
import { getBreakdowns } from "@/lib/analytics/queries";
import { requireAppContext } from "@/lib/auth/app-context";
import { formatNumber, formatUsd } from "@/lib/utils";

export default async function ModelsPage() {
  const { membership } = await requireAppContext();
  const { byModel } = await getBreakdowns(
    membership.organizationId,
    membership.plan,
    filtersFromSearch(new URLSearchParams("range=30d")),
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Models</h1>
        <p className="text-sm text-muted-foreground">Find expensive or slow models from the last 30 days.</p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-secondary/60 text-xs text-muted-foreground">
            <tr>
              {["Model", "Calls", "Cost", "Tokens", "Latency", "Failure rate"].map((col) => (
                <th key={col} className="px-3 py-2 font-medium">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {byModel.map((row) => (
              <tr key={row.key} className="border-t border-border">
                <td className="px-3 py-2 font-medium">{row.key}</td>
                <td className="px-3 py-2">{formatNumber(row.runs)}</td>
                <td className="px-3 py-2">{formatUsd(row.cost)}</td>
                <td className="px-3 py-2">{formatNumber(row.tokens)}</td>
                <td className="px-3 py-2">{Math.round(row.latency)}ms</td>
                <td className="px-3 py-2">{row.runs ? ((row.failures / row.runs) * 100).toFixed(1) : "0.0"}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
