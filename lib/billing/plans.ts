import type { Plan } from "@/types/domain";

export const PLAN_CATALOG: Record<
  Plan,
  { name: string; monthlyUsd: number; blurb: string; features: string[] }
> = {
  free: {
    name: "Free",
    monthlyUsd: 0,
    blurb: "Trace a first agent and see if the product fits.",
    features: ["5,000 runs / month", "1 project", "3-day retention", "Ingestion API"],
  },
  pro: {
    name: "Pro",
    monthlyUsd: 29,
    blurb: "Cost control and alerts for a production agent.",
    features: ["100,000 runs / month", "5 projects", "30-day retention", "Alerts", "Cost budgets"],
  },
  team: {
    name: "Team",
    monthlyUsd: 99,
    blurb: "Shared workspace for an engineering org.",
    features: [
      "1,000,000 runs / month",
      "Unlimited projects",
      "90-day retention",
      "Team roles",
      "Advanced analytics",
    ],
  },
};
