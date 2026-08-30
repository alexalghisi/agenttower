import Link from "next/link";

const LINKS = [
  { href: "/settings", label: "Organization" },
  { href: "/settings/team", label: "Team" },
  { href: "/settings/keys", label: "API keys" },
  { href: "/settings/billing", label: "Billing" },
  { href: "/settings/security", label: "Security" },
  { href: "/settings/audit", label: "Audit log" },
];

export function SettingsNav() {
  return (
    <nav className="flex flex-wrap gap-2">
      {LINKS.map((item) => (
        <Link key={item.href} href={item.href} className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-secondary">
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
