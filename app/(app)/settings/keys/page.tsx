import { desc, eq } from "drizzle-orm";
import { requireAppContext } from "@/lib/auth/app-context";
import { getDb } from "@/lib/db/client";
import { apiKeys } from "@/lib/db/schema";
import { revokeApiKeyAction } from "@/features/settings/actions";
import { SettingsNav } from "@/components/settings-nav";
import { Button } from "@/components/ui/button";
import { CreateKeyButton } from "@/components/create-key-button";
import { formatRelative } from "@/lib/utils";

export default async function KeysPage() {
  const { membership } = await requireAppContext();
  const db = await getDb();
  const keys = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.organizationId, membership.organizationId))
    .orderBy(desc(apiKeys.createdAt));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">API keys</h1>
      <SettingsNav />
      <CreateKeyButton organizationId={membership.organizationId} />
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary/60 text-xs text-muted-foreground">
            <tr>
              {["Name", "Prefix", "Created", "Last used", "Status", ""].map((col) => (
                <th key={col} className="px-3 py-2">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {keys.map((key) => (
              <tr key={key.id} className="border-t border-border">
                <td className="px-3 py-2">{key.name}</td>
                <td className="px-3 py-2 font-mono text-xs">{key.prefix}…</td>
                <td className="px-3 py-2">{formatRelative(key.createdAt)}</td>
                <td className="px-3 py-2">{key.lastUsedAt ? formatRelative(key.lastUsedAt) : "—"}</td>
                <td className="px-3 py-2">{key.revokedAt ? "revoked" : "active"}</td>
                <td className="px-3 py-2">
                  {!key.revokedAt ? (
                    <form action={revokeApiKeyAction.bind(null, membership.organizationId, key.id)}>
                      <Button type="submit" size="sm" variant="ghost">Revoke</Button>
                    </form>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
