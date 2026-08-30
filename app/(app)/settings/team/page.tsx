import { eq } from "drizzle-orm";
import { requireAppContext } from "@/lib/auth/app-context";
import { getDb } from "@/lib/db/client";
import { organizationMembers, profiles, users } from "@/lib/db/schema";
import { inviteMemberAction } from "@/features/settings/actions";
import { SettingsNav } from "@/components/settings-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function TeamSettingsPage() {
  const { membership } = await requireAppContext();
  const db = await getDb();
  const members = await db
    .select({
      id: organizationMembers.id,
      role: organizationMembers.role,
      email: users.email,
      name: profiles.displayName,
    })
    .from(organizationMembers)
    .innerJoin(users, eq(users.id, organizationMembers.userId))
    .innerJoin(profiles, eq(profiles.userId, users.id))
    .where(eq(organizationMembers.organizationId, membership.organizationId));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Team</h1>
      <SettingsNav />
      <div className="rounded-xl border border-border">
        {members.map((member) => (
          <div key={member.id} className="flex items-center justify-between border-b border-border px-4 py-3 text-sm last:border-0">
            <div>
              <p className="font-medium">{member.name}</p>
              <p className="text-muted-foreground">{member.email}</p>
            </div>
            <span className="text-xs uppercase">{member.role}</span>
          </div>
        ))}
      </div>
      <form
        action={async (formData: FormData) => {
          "use server";
          const { membership: ctx } = await requireAppContext();
          await inviteMemberAction(
            ctx.organizationId,
            String(formData.get("email")),
            String(formData.get("role")) as "admin" | "developer" | "viewer",
          );
        }}
        className="flex max-w-xl flex-wrap gap-2"
      >
        <Input name="email" type="email" placeholder="Invite email" required className="w-56" />
        <select name="role" className="h-9 rounded-md border border-input bg-card px-2 text-sm">
          <option value="developer">developer</option>
          <option value="admin">admin</option>
          <option value="viewer">viewer</option>
        </select>
        <Button type="submit">Invite</Button>
      </form>
      <p className="text-xs text-muted-foreground">Invitations are token links, not SMTP. Team plan required.</p>
    </div>
  );
}
