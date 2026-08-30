"use server";

import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, getSessionUser } from "@/lib/auth/session";
import { createApiKey } from "@/lib/api/keys";
import { getDb } from "@/lib/db/client";
import {
  emailTokens,
  organizationMembers,
  organizations,
  profiles,
  projects,
  subscriptions,
  users,
} from "@/lib/db/schema";
import { writeAudit } from "@/lib/tenant";
import { sha256Hex } from "@/lib/crypto";
import { newId, slugify } from "@/lib/utils";
import { stacks } from "@/types/domain";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function registerAction(formData: FormData) {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("name") ?? "").trim();

  if (!email.includes("@") || password.length < 8 || displayName.length < 2) {
    return { error: "Name, a valid email, and a password of at least 8 characters are required." };
  }

  const db = await getDb();
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing[0]) return { error: "An account with that email already exists." };

  const userId = newId();
  await db.insert(users).values({
    id: userId,
    email,
    passwordHash: await hashPassword(password),
  });
  await db.insert(profiles).values({ userId, displayName });

  const verifyToken = newId() + newId();
  await db.insert(emailTokens).values({
    id: newId(),
    userId,
    purpose: "verify",
    tokenHash: sha256Hex(verifyToken),
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
  });

  await createSession(userId);
  redirect(`/verify?token=${verifyToken}`);
}

export async function loginAction(formData: FormData) {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const db = await getDb();
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = rows[0];
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Invalid email or password." };
  }
  await createSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const db = await getDb();
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = rows[0];
  if (!user) return { ok: true, token: null as string | null };

  const token = newId() + newId();
  await db.insert(emailTokens).values({
    id: newId(),
    userId: user.id,
    purpose: "reset",
    tokenHash: sha256Hex(token),
    expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
  });
  return { ok: true, token };
}

export async function resetPasswordAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const db = await getDb();
  const rows = await db
    .select()
    .from(emailTokens)
    .where(and(eq(emailTokens.tokenHash, sha256Hex(token)), eq(emailTokens.purpose, "reset"), isNull(emailTokens.usedAt)))
    .limit(1);
  const row = rows[0];
  if (!row || row.expiresAt.getTime() < Date.now()) return { error: "Reset link is invalid or expired." };

  await db.update(users).set({ passwordHash: await hashPassword(password), updatedAt: new Date() }).where(eq(users.id, row.userId));
  await db.update(emailTokens).set({ usedAt: new Date() }).where(eq(emailTokens.id, row.id));
  await createSession(row.userId);
  redirect("/dashboard");
}

export async function verifyEmailAction(token: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(emailTokens)
    .where(and(eq(emailTokens.tokenHash, sha256Hex(token)), eq(emailTokens.purpose, "verify"), isNull(emailTokens.usedAt)))
    .limit(1);
  const row = rows[0];
  if (!row || row.expiresAt.getTime() < Date.now()) return { error: "Verification link is invalid or expired." };
  await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, row.userId));
  await db.update(emailTokens).set({ usedAt: new Date() }).where(eq(emailTokens.id, row.id));
  return { ok: true };
}

export async function completeOnboardingAction(input: {
  organizationName: string;
  projectName: string;
  stack: string;
}) {
  const user = await getSessionUser();
  if (!user) return { error: "Authentication required." };
  if (!input.organizationName.trim() || !input.projectName.trim()) {
    return { error: "Organization and project names are required." };
  }
  if (!stacks.includes(input.stack as (typeof stacks)[number])) {
    return { error: "Choose a supported stack." };
  }

  const db = await getDb();
  const organizationId = newId();
  const slugBase = slugify(input.organizationName) || "org";
  const slug = `${slugBase}-${organizationId.slice(0, 8)}`;

  await db.insert(organizations).values({
    id: organizationId,
    name: input.organizationName.trim(),
    slug,
    stack: input.stack,
    onboardedAt: new Date(),
  });
  await db.insert(organizationMembers).values({
    id: newId(),
    organizationId,
    userId: user.id,
    role: "owner",
  });
  await db.insert(subscriptions).values({
    id: newId(),
    organizationId,
    plan: "free",
    status: "active",
  });

  const projectId = newId();
  await db.insert(projects).values({
    id: projectId,
    organizationId,
    name: input.projectName.trim(),
    slug: slugify(input.projectName) || "project",
  });

  const key = await createApiKey({
    organizationId,
    projectId,
    name: "Default ingest key",
    createdByUserId: user.id,
  });

  await writeAudit({
    organizationId,
    actorUserId: user.id,
    action: "organization.created",
    entityType: "organization",
    entityId: organizationId,
  });

  return { organizationId, projectId, apiKey: key.plaintext, prefix: key.prefix };
}
