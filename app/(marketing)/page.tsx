import Link from "next/link";
import { Activity, CircleDollarSign, Shield, TowerControl, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLAN_CATALOG } from "@/lib/billing/plans";

const FAQ = [
  {
    q: "Is this a real product or a case study?",
    a: "AgentTower is a personal portfolio project and technical case study. The ingestion API, tenancy, and dashboards are functional. Seed data is fictional.",
  },
  {
    q: "Do I need Stripe or Supabase to try it?",
    a: "No. Local mode uses an embedded Postgres (PGlite), cookie sessions, and a billing simulator. Stripe and Supabase are optional adapters.",
  },
  {
    q: "Does it connect to my bank or model vendor account?",
    a: "No. You send traces through the API or SDK. Cost is estimated from token counts and published list rates.",
  },
  {
    q: "Is the SDK on npm?",
    a: "Not yet. The client lives in packages/sdk and talks to POST /api/v1/runs.",
  },
];

export default function MarketingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 font-semibold">
          <TowerControl className="size-5 text-primary" />
          AgentTower
        </div>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href="#product">Product</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="flex gap-2">
          <Button asChild variant="ghost">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Start monitoring free</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">Portfolio case study</p>
        <h1 className="mt-3 max-w-3xl text-5xl font-semibold tracking-tight text-balance">
          Know exactly what your AI agents are doing.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
          Debug failures, monitor costs, trace execution and improve AI agent reliability from one control center.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/signup">Start monitoring free</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">View demo</Link>
          </Button>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Demo workspace: <code>demo@agenttower.dev</code> / <code>DemoPass123!</code>
        </p>
      </section>

      <section id="product" className="border-y border-border bg-card/40">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-16 md:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Workflow, title: "Trace debugging", body: "Waterfall timelines for LLM calls and tools, with inputs, outputs, and latency." },
            { icon: CircleDollarSign, title: "Cost control", body: "Spend by agent, model, and project. Budgets and threshold alerts." },
            { icon: Activity, title: "Live operations", body: "Success rate, failures, and token burn on one filtered dashboard." },
            { icon: Shield, title: "Tenant isolation", body: "Org-scoped queries, hashed API keys, role checks, and shipped RLS policies." },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-border bg-card p-5">
              <item.icon className="size-5 text-primary" />
              <h2 className="mt-3 text-sm font-semibold">{item.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-semibold">Pricing</h2>
        <p className="mt-2 text-sm text-muted-foreground">List prices for the case study. Stripe is optional; local billing can simulate a plan change.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {Object.entries(PLAN_CATALOG).map(([key, plan]) => (
            <div key={key} className="rounded-xl border border-border bg-card p-6">
              <p className="text-sm text-muted-foreground">{plan.name}</p>
              <p className="mt-2 text-3xl font-semibold">${plan.monthlyUsd}</p>
              <p className="mt-2 text-sm text-muted-foreground">{plan.blurb}</p>
              <ul className="mt-4 space-y-2 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-3xl px-6 pb-20">
        <h2 className="text-2xl font-semibold">FAQ</h2>
        <div className="mt-6 space-y-4">
          {FAQ.map((item) => (
            <div key={item.q} className="rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold">{item.q}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
