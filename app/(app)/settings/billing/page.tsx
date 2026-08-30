import { requireAppContext } from "@/lib/auth/app-context";
import { PLAN_CATALOG } from "@/lib/billing/plans";
import { billingAdapter } from "@/lib/billing/stripe";
import { simulatePlanAction, startCheckoutAction } from "@/features/settings/actions";
import { SettingsNav } from "@/components/settings-nav";
import { Button } from "@/components/ui/button";
import type { Plan } from "@/types/domain";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { membership } = await requireAppContext();
  const params = await searchParams;
  const adapter = billingAdapter();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Billing</h1>
      <SettingsNav />
      <p className="text-sm text-muted-foreground">
        Current plan: <strong>{membership.plan}</strong>. Billing adapter: {adapter.mode}.
        {params.checkout ? ` Checkout ${params.checkout}.` : ""}
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {(Object.keys(PLAN_CATALOG) as Plan[]).map((plan) => (
          <div key={plan} className="rounded-xl border border-border p-4">
            <h2 className="font-semibold">{PLAN_CATALOG[plan].name}</h2>
            <p className="mt-1 text-2xl">${PLAN_CATALOG[plan].monthlyUsd}</p>
            {plan === "free" ? (
              <form action={simulatePlanAction.bind(null, membership.organizationId, "free")}>
                <Button type="submit" variant="outline" className="mt-4">Use Free</Button>
              </form>
            ) : (
              <form
                action={async () => {
                  "use server";
                  const { membership: ctx } = await requireAppContext();
                  const url = await startCheckoutAction(ctx.organizationId, plan);
                  const { redirect } = await import("next/navigation");
                  redirect(url);
                }}
              >
                <Button type="submit" className="mt-4">
                  {adapter.mode === "stripe" ? "Checkout" : "Simulate upgrade"}
                </Button>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
