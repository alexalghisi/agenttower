import type { Plan, Role } from "@/types/domain";

const ROLE_RANK: Record<Role, number> = {
  viewer: 1,
  developer: 2,
  admin: 3,
  owner: 4,
};

export function can(role: Role, minimum: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export const permissions = {
  view: "viewer",
  ingestManage: "developer",
  writeSettings: "admin",
  manageBilling: "owner",
  manageMembers: "admin",
} as const satisfies Record<string, Role>;

export const PLAN_LIMITS: Record<
  Plan,
  { runsPerMonth: number; projects: number; retentionDays: number; alerts: boolean; team: boolean }
> = {
  free: { runsPerMonth: 5_000, projects: 1, retentionDays: 3, alerts: false, team: false },
  pro: { runsPerMonth: 100_000, projects: 5, retentionDays: 30, alerts: true, team: false },
  team: { runsPerMonth: 1_000_000, projects: Number.POSITIVE_INFINITY, retentionDays: 90, alerts: true, team: true },
};

export function retentionStart(plan: Plan, now = new Date()): Date {
  const days = PLAN_LIMITS[plan].retentionDays;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}
