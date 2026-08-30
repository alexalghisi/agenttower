import Link from "next/link";
import { listErrors } from "@/lib/analytics/queries";
import { requireAppContext } from "@/lib/auth/app-context";
import { StatusBadge } from "@/components/product/status-badge";
import { EmptyState } from "@/components/product/empty-state";
import { formatRelative } from "@/lib/utils";

export default async function ErrorsPage() {
  const { membership } = await requireAppContext();
  const groups = await listErrors(membership.organizationId, membership.plan);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Error tracking</h1>
      {groups.length === 0 ? (
        <EmptyState title="No grouped failures" description="Failed ingestions with an error payload appear here." />
      ) : (
        <div className="space-y-2">
          {groups.map((group) => (
            <Link
              key={group.id}
              href={`/errors/${group.id}`}
              className="block rounded-xl border border-border bg-card p-4 hover:bg-secondary/40"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold">{group.title}</h2>
                <StatusBadge status={group.status} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{group.message}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {group.occurrenceCount} occurrences · last seen {formatRelative(group.lastSeenAt)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
