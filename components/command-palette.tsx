"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "lucide-react";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/runs", label: "Run explorer" },
  { href: "/agents", label: "Agents" },
  { href: "/models", label: "Models" },
  { href: "/errors", label: "Errors" },
  { href: "/costs", label: "Cost control" },
  { href: "/alerts", label: "Alerts" },
  { href: "/settings", label: "Settings" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!open) return null;
  const items = LINKS.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-24" onClick={() => setOpen(false)}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-popover shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Command className="size-4 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Jump to…"
            className="h-11 w-full bg-transparent text-sm outline-none"
          />
        </div>
        <ul className="max-h-72 overflow-y-auto p-1">
          {items.map((item) => (
            <li key={item.href}>
              <button
                type="button"
                className="flex w-full rounded-md px-3 py-2 text-left text-sm hover:bg-secondary"
                onClick={() => {
                  router.push(item.href);
                  setOpen(false);
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
