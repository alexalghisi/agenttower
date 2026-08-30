import { requireAppContext } from "@/lib/auth/app-context";
import { supabaseConfigured } from "@/lib/supabase/server";
import { SettingsNav } from "@/components/settings-nav";

export default async function SecurityPage() {
  const { membership } = await requireAppContext();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Security</h1>
      <SettingsNav />
      <ul className="space-y-2 text-sm">
        <li>Organization is derived from the session membership, never from a client-supplied org id on mutations.</li>
        <li>API keys are SHA-256 hashed. Prefix only is stored for display.</li>
        <li>Supabase RLS policies ship in supabase/migrations. Hosted Supabase configured: {supabaseConfigured() ? "yes" : "no"}.</li>
        <li>Current role: {membership.role}. Role checks run on the server.</li>
      </ul>
    </div>
  );
}
