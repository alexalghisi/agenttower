import { desc, eq } from "drizzle-orm";
import { requireAppContext } from "@/lib/auth/app-context";
import { getDb } from "@/lib/db/client";
import { auditLogs } from "@/lib/db/schema";
import { SettingsNav } from "@/components/settings-nav";
import { formatRelative } from "@/lib/utils";

export default async function AuditPage() {
  const { membership } = await requireAppContext();
  const db = await getDb();
  const rows = await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.organizationId, membership.organizationId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(50);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Audit log</h1>
      <SettingsNav />
      <ul className="space-y-2 text-sm">
        {rows.map((row) => (
          <li key={row.id} className="rounded-lg border border-border px-3 py-2">
            <span className="font-medium">{row.action}</span>
            <span className="text-muted-foreground">
              {" "}
              · {row.entityType} · {formatRelative(row.createdAt)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
