import { and, eq } from "drizzle-orm";
import { getMemberships, getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { auditLogs, organizationMembers, organizations, subscriptions } from "@/lib/db/schema";
import { can } from "@/lib/permissions";
import { newId } from "@/lib/utils";
import type { Membership, Role, SessionUser } from "@/types/domain";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export type TenantContext = {
  user: SessionUser;
  membership: Membership;
};

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new HttpError(401, "Authentication required");
  return user;
}

export async function requireTenant(organizationId?: string | null): Promise<TenantContext> {
  const user = await requireUser();
  const memberships = await getMemberships(user.id);
  if (memberships.length === 0) throw new HttpError(403, "No organization");

  const membership = organizationId
    ? memberships.find((item) => item.organizationId === organizationId)
    : memberships[0];

  if (!membership) throw new HttpError(404, "Organization not found");
  return { user, membership };
}

export async function requireRole(organizationId: string, minimum: Role): Promise<TenantContext> {
  const ctx = await requireTenant(organizationId);
  if (!can(ctx.membership.role, minimum)) {
    throw new HttpError(403, "You do not have permission to do that");
  }
  return ctx;
}

export async function writeAudit(input: {
  organizationId: string;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  const db = await getDb();
  await db.insert(auditLogs).values({
    id: newId(),
    organizationId: input.organizationId,
    actorUserId: input.actorUserId ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    metadata: input.metadata ?? {},
  });
}

export async function getOrganizationPlan(organizationId: string) {
  const db = await getDb();
  const rows = await db
    .select({
      plan: subscriptions.plan,
      status: subscriptions.status,
      name: organizations.name,
      monthlyBudget: organizations.monthlyBudget,
    })
    .from(subscriptions)
    .innerJoin(organizations, eq(organizations.id, subscriptions.organizationId))
    .where(eq(subscriptions.organizationId, organizationId))
    .limit(1);
  return rows[0] ?? null;
}

export async function assertMembership(userId: string, organizationId: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(organizationMembers)
    .where(
      and(eq(organizationMembers.userId, userId), eq(organizationMembers.organizationId, organizationId)),
    )
    .limit(1);
  const found = rows[0];
  if (!found) throw new HttpError(404, "Organization not found");
  return found;
}
