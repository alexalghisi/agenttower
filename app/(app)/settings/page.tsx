import { eq } from "drizzle-orm";
import { requireAppContext } from "@/lib/auth/app-context";
import { getDb } from "@/lib/db/client";
import { organizations } from "@/lib/db/schema";
import { updateOrganizationAction } from "@/features/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SettingsNav } from "@/components/settings-nav";
import { parseNumber } from "@/lib/utils";

export default async function SettingsPage() {
  const { membership } = await requireAppContext();
  const db = await getDb();
  const org = (await db.select().from(organizations).where(eq(organizations.id, membership.organizationId)))[0];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Organization</h1>
      <SettingsNav />
      <form
        action={async (formData: FormData) => {
          "use server";
          const { membership: ctx } = await requireAppContext();
          await updateOrganizationAction(
            ctx.organizationId,
            String(formData.get("name")),
            Number(formData.get("budget")),
          );
        }}
        className="max-w-md space-y-3 rounded-xl border border-border p-4"
      >
        <label className="block text-sm">
          Name
          <Input name="name" defaultValue={org?.name} className="mt-1" />
        </label>
        <label className="block text-sm">
          Monthly budget
          <Input name="budget" type="number" defaultValue={parseNumber(org?.monthlyBudget)} className="mt-1" />
        </label>
        <p className="text-xs text-muted-foreground">Slug: {org?.slug}</p>
        <Button type="submit">Save</Button>
      </form>
    </div>
  );
}
