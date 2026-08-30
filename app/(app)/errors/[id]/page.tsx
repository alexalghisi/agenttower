import Link from "next/link";
import { notFound } from "next/navigation";
import { getErrorDetail } from "@/lib/analytics/queries";
import { requireAppContext } from "@/lib/auth/app-context";
import { setErrorStatusAction } from "@/features/settings/actions";
import { StatusBadge } from "@/components/product/status-badge";
import { Button } from "@/components/ui/button";
import { formatRelative } from "@/lib/utils";

export default async function ErrorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { membership } = await requireAppContext();
  const detail = await getErrorDetail(membership.organizationId, id);
  if (!detail) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{detail.group.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{detail.group.message}</p>
          <div className="mt-2"><StatusBadge status={detail.group.status} /></div>
        </div>
        <div className="flex gap-2">
          <form action={setErrorStatusAction.bind(null, membership.organizationId, id, "resolved")}>
            <Button type="submit" variant="outline">Mark resolved</Button>
          </form>
          <form action={setErrorStatusAction.bind(null, membership.organizationId, id, "ignored")}>
            <Button type="submit" variant="ghost">Ignore</Button>
          </form>
        </div>
      </div>
      <div>
        <h2 className="text-sm font-semibold">Occurrence history</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {detail.occurrences.map((item) => (
            <li key={item.id} className="rounded-lg border border-border px-3 py-2">
              <Link href={`/runs/${item.id}`} className="hover:underline">{item.traceId}</Link>
              <span className="text-muted-foreground">
                {" "}
                · {item.agentName} · {item.environment} · {formatRelative(item.startedAt)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
