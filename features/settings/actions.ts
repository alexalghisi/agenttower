"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createApiKey } from "@/lib/api/keys";
import { billingAdapter } from "@/lib/billing/stripe";
import { getDb } from "@/lib/db/client";
import {
  alerts,
  apiKeys,
  errors,
  invitations,
  organizationMembers,
  organizations,
  subscriptions,
} from "@/lib/db/schema";
import { PLAN_LIMITS } from "@/lib/permissions";
import { requireRole, writeAudit } from "@/lib/tenant";
import { sha256Hex } from "@/lib/crypto";
import { newId } from "@/lib/utils";
import type { Plan, Role } from "@/types/domain";

export async function createApiKeyAction(organizationId: string, name: string) {
  const ctx = await requireRole(organizationId, "developer");
  const key = await createApiKey({
    organizationId,
    name: name.trim() || "Ingest key",
    createdByUserId: ctx.user.id,
  });
  await writeAudit({
    organizationId,
    actorUserId: ctx.user.id,
    action: "api_key.created",
    entityType: "api_key",
    entityId: key.id,
  });
  revalidatePath("/settings/keys");
  return key;
}

export async function revokeApiKeyAction(organizationId: string, keyId: string) {
  const ctx = await requireRole(organizationId, "developer");
  const db = await getDb();
  await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.organizationId, organizationId), eq(apiKeys.id, keyId)));
  await writeAudit({
    organizationId,
    actorUserId: ctx.user.id,
    action: "api_key.revoked",
    entityType: "api_key",
    entityId: keyId,
  });
  revalidatePath("/settings/keys");
}

export async function inviteMemberAction(organizationId: string, email: string, role: Exclude<Role, "owner">) {
  const ctx = await requireRole(organizationId, "admin");
  if (!PLAN_LIMITS[ctx.membership.plan].team && ctx.membership.plan !== "team") {
    return { error: "Team invitations require the Team plan." };
  }
  const db = await getDb();
  const token = newId() + newId();
  await db.insert(invitations).values({
    id: newId(),
    organizationId,
    email: email.trim().toLowerCase(),
    role,
    tokenHash: sha256Hex(token),
    invitedByUserId: ctx.user.id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  await writeAudit({
    organizationId,
    actorUserId: ctx.user.id,
    action: "invite.created",
    entityType: "invitation",
    metadata: { email, role },
  });
  revalidatePath("/settings/team");
  return { token };
}

export async function updateMemberRoleAction(organizationId: string, memberId: string, role: Role) {
  const ctx = await requireRole(organizationId, "owner");
  const db = await getDb();
  await db
    .update(organizationMembers)
    .set({ role })
    .where(and(eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.id, memberId)));
  await writeAudit({
    organizationId,
    actorUserId: ctx.user.id,
    action: "member.role_changed",
    entityType: "member",
    entityId: memberId,
    metadata: { role },
  });
  revalidatePath("/settings/team");
}

export async function updateOrganizationAction(organizationId: string, name: string, budget: number) {
  const ctx = await requireRole(organizationId, "admin");
  const db = await getDb();
  await db
    .update(organizations)
    .set({ name: name.trim(), monthlyBudget: budget.toFixed(2), updatedAt: new Date() })
    .where(eq(organizations.id, organizationId));
  await writeAudit({
    organizationId,
    actorUserId: ctx.user.id,
    action: "organization.updated",
    entityType: "organization",
    entityId: organizationId,
  });
  revalidatePath("/settings");
}

export async function createAlertAction(input: {
  organizationId: string;
  name: string;
  type: string;
  threshold: number;
  windowMinutes: number;
  channel: string;
}) {
  const ctx = await requireRole(input.organizationId, "admin");
  if (!PLAN_LIMITS[ctx.membership.plan].alerts) {
    return { error: "Alerts require the Pro or Team plan." };
  }
  const db = await getDb();
  await db.insert(alerts).values({
    id: newId(),
    organizationId: input.organizationId,
    name: input.name,
    type: input.type,
    threshold: input.threshold.toString(),
    windowMinutes: input.windowMinutes,
    channel: input.channel,
    enabled: true,
  });
  revalidatePath("/alerts");
  return { ok: true };
}

export async function setErrorStatusAction(
  organizationId: string,
  errorId: string,
  status: "open" | "resolved" | "ignored",
) {
  await requireRole(organizationId, "developer");
  const db = await getDb();
  await db
    .update(errors)
    .set({ status })
    .where(and(eq(errors.organizationId, organizationId), eq(errors.id, errorId)));
  revalidatePath("/errors");
}

export async function simulatePlanAction(organizationId: string, plan: Plan) {
  const ctx = await requireRole(organizationId, "owner");
  const db = await getDb();
  await db
    .update(subscriptions)
    .set({ plan, status: "active", updatedAt: new Date() })
    .where(eq(subscriptions.organizationId, organizationId));
  await writeAudit({
    organizationId,
    actorUserId: ctx.user.id,
    action: "plan.changed",
    entityType: "subscription",
    metadata: { plan, mode: "local" },
  });
  revalidatePath("/settings/billing");
}

export async function startCheckoutAction(organizationId: string, plan: Exclude<Plan, "free">) {
  const ctx = await requireRole(organizationId, "owner");
  const adapter = billingAdapter();
  if (adapter.mode === "local") {
    await simulatePlanAction(organizationId, plan);
    return "/settings/billing";
  }
  return adapter.createCheckoutUrl({
    organizationId,
    plan,
    customerEmail: ctx.user.email,
  });
}
