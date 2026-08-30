import { AppShell } from "@/components/app-shell";
import { requireAppContext } from "@/lib/auth/app-context";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, membership } = await requireAppContext();
  return (
    <AppShell user={user} membership={membership}>
      {children}
    </AppShell>
  );
}
