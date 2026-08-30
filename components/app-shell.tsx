import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Bot,
  CircleDollarSign,
  Cpu,
  LayoutDashboard,
  LogOut,
  Settings,
  TowerControl,
} from "lucide-react";
import { logoutAction } from "@/features/auth/actions";
import { CommandPalette } from "@/components/command-palette";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Membership, SessionUser } from "@/types/domain";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/runs", label: "Runs", icon: Activity },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/models", label: "Models", icon: Cpu },
  { href: "/errors", label: "Errors", icon: AlertTriangle },
  { href: "/costs", label: "Costs", icon: CircleDollarSign },
  { href: "/alerts", label: "Alerts", icon: AlertTriangle },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({
  user,
  membership,
  children,
}: {
  user: SessionUser;
  membership: Membership;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-border bg-sidebar lg:border-r lg:border-b-0">
        <div className="flex items-center gap-2 px-4 py-4">
          <TowerControl className="size-5 text-primary" />
          <div>
            <p className="text-sm font-semibold">AgentTower</p>
            <p className="text-[11px] text-muted-foreground">{membership.organizationName}</p>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-sidebar-foreground hover:bg-secondary"
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {membership.role} · {membership.plan} · ⌘K
          </p>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <span className="text-sm">{user.displayName}</span>
            <form action={logoutAction}>
              <button type="submit" className="inline-flex size-8 items-center justify-center rounded-md hover:bg-secondary" aria-label="Log out">
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </header>
        <main className="p-4 lg:p-6">{children}</main>
      </div>
      <CommandPalette />
    </div>
  );
}
