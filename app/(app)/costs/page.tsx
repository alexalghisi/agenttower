import { eq } from "drizzle-orm";
import { filtersFromSearch } from "@/lib/analytics/filters";
import { getCostSummary } from "@/lib/analytics/queries";
import { requireAppContext } from "@/lib/auth/app-context";
import { getDb } from "@/lib/db/client";
import { organizations } from "@/lib/db/schema";
import { updateOrganizationAction } from "@/features/settings/actions";
import { StatCard } from "@/components/product/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatUsd, parseNumber } from "@/lib/utils";

export default async function CostsPage() {
  const { membership } = await requireAppContext();
  const filters = filtersFromSearch(new URLSearchParams("range=30d"));
  const summary = await getCostSummary(membership.organizationId, membership.plan, filters);
  const db = await getDb();
  const org = await db.select().from(organizations).where(eq(organizations.id, membership.organizationId)).limit(1);
  const budget = parseNumber(org[0]?.monthlyBudget);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Cost control</h1>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Spend this window" value={formatUsd(summary.cost)} />
        <StatCard label="Projected monthly" value={formatUsd(summary.projected)} />
        <StatCard label="Cost / successful run" value={formatUsd(summary.costPerSuccess, 4)} />
        <StatCard label="Budget used" value={`${budget ? ((summary.cost / budget) * 100).toFixed(1) : "0.0"}%`} hint={`Budget ${formatUsd(budget)}`} />
      </div>
      <form
        action={async (formData: FormData) => {
          "use server";
          const { membership: ctx } = await requireAppContext();
          await updateOrganizationAction(ctx.organizationId, ctx.organizationName, Number(formData.get("budget")));
        }}
        className="flex max-w-sm items-end gap-2"
      >
        <div className="flex-1">
          <label className="text-xs text-muted-foreground">Monthly budget (USD)</label>
          <Input name="budget" type="number" step="1" defaultValue={budget} />
        </div>
        <Button type="submit">Save</Button>
      </form>
      <p className="text-xs text-muted-foreground">Alert thresholds at 50 / 75 / 90 / 100% are evaluated from budget usage alerts.</p>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { title: "By project", rows: summary.byProject },
          { title: "By agent", rows: summary.byAgent.map((row) => ({ key: row.key, cost: row.cost })) },
          { title: "By model", rows: summary.byModel.map((row) => ({ key: row.key, cost: row.cost })) },
        ].map((block) => (
          <div key={block.title} className="rounded-xl border border-border p-4">
            <h2 className="text-sm font-semibold">{block.title}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {block.rows.map((row) => (
                <li key={row.key} className="flex justify-between">
                  <span>{row.key}</span>
                  <span>{formatUsd(row.cost)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
