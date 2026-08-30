import { desc, eq } from "drizzle-orm";
import { requireAppContext } from "@/lib/auth/app-context";
import { getDb } from "@/lib/db/client";
import { alertEvents, alerts } from "@/lib/db/schema";
import { createAlertAction } from "@/features/settings/actions";
import { PLAN_LIMITS } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatRelative } from "@/lib/utils";

export default async function AlertsPage() {
  const { membership } = await requireAppContext();
  const db = await getDb();
  const rules = await db.select().from(alerts).where(eq(alerts.organizationId, membership.organizationId));
  const events = await db
    .select()
    .from(alertEvents)
    .where(eq(alertEvents.organizationId, membership.organizationId))
    .orderBy(desc(alertEvents.createdAt))
    .limit(20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Alerts</h1>
        <p className="text-sm text-muted-foreground">
          In-app events are stored. Email, Slack, and webhook channels are adapters that log a simulated delivery.
        </p>
      </div>
      {!PLAN_LIMITS[membership.plan].alerts ? (
        <p className="rounded-xl border border-border p-4 text-sm">Alerts are gated to Pro and Team. Simulate an upgrade in Billing.</p>
      ) : (
        <form
          action={async (formData: FormData) => {
            "use server";
            const { membership: ctx } = await requireAppContext();
            await createAlertAction({
              organizationId: ctx.organizationId,
              name: String(formData.get("name")),
              type: String(formData.get("type")),
              threshold: Number(formData.get("threshold")),
              windowMinutes: Number(formData.get("window") ?? 60),
              channel: String(formData.get("channel") ?? "in_app"),
            });
          }}
          className="grid gap-3 rounded-xl border border-border p-4 md:grid-cols-5"
        >
          <Input name="name" placeholder="Name" required />
          <select name="type" className="h-9 rounded-md border border-input bg-card px-2 text-sm">
            <option value="error_rate">Error rate %</option>
            <option value="cost">Cost $</option>
            <option value="latency">Latency ms</option>
            <option value="success_rate">Success rate %</option>
            <option value="budget_usage">Budget usage %</option>
            <option value="failure_count">Failures in window</option>
          </select>
          <Input name="threshold" type="number" step="0.1" placeholder="Threshold" required />
          <select name="channel" className="h-9 rounded-md border border-input bg-card px-2 text-sm">
            <option value="in_app">In-app</option>
            <option value="email">Email (simulated)</option>
            <option value="slack">Slack (simulated)</option>
            <option value="webhook">Webhook (simulated)</option>
          </select>
          <Button type="submit">Create</Button>
        </form>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border p-4">
          <h2 className="text-sm font-semibold">Rules</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {rules.map((rule) => (
              <li key={rule.id} className="flex justify-between gap-3">
                <span>{rule.name}</span>
                <span className="text-muted-foreground">{rule.type} {rule.threshold}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl border border-border p-4">
          <h2 className="text-sm font-semibold">Triggered events</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {events.map((event) => (
              <li key={event.id}>
                <p>{event.message}</p>
                <p className="text-xs text-muted-foreground">
                  via {event.deliveredVia} · {formatRelative(event.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
