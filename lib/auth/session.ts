import { cookies } from "next/headers";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { organizationMembers, organizations, profiles, sessions, subscriptions, users } from "@/lib/db/schema";
import { SESSION_COOKIE } from "@/lib/auth/cookie";
import { sha256Hex } from "@/lib/crypto";
import { newId } from "@/lib/utils";
import type { Membership, SessionUser } from "@/types/domain";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

export async function createSession(userId: string, meta?: { userAgent?: string; ip?: string }) {
  const db = await getDb();
  const token = newId() + newId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + THIRTY_DAYS * 1000);

  await db.insert(sessions).values({
    id: newId(),
    userId,
    tokenHash: sha256Hex(token),
    expiresAt,
    userAgent: meta?.userAgent ?? null,
    ip: meta?.ip ?? null,
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: THIRTY_DAYS,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.tokenHash, sha256Hex(token)));
  }
  store.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const db = await getDb();
  const rows = await db
    .select({
      userId: users.id,
      email: users.email,
      displayName: profiles.displayName,
      expiresAt: sessions.expiresAt,
      revokedAt: sessions.revokedAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .innerJoin(profiles, eq(profiles.userId, users.id))
    .where(and(eq(sessions.tokenHash, sha256Hex(token)), isNull(sessions.revokedAt)))
    .limit(1);

  const row = rows[0];
  if (!row || row.expiresAt.getTime() < Date.now()) return null;

  return { id: row.userId, email: row.email, displayName: row.displayName };
}

export async function getMemberships(userId: string): Promise<Membership[]> {
  const db = await getDb();
  const rows = await db
    .select({
      organizationId: organizations.id,
      organizationName: organizations.name,
      organizationSlug: organizations.slug,
      role: organizationMembers.role,
      plan: subscriptions.plan,
      onboardedAt: organizations.onboardedAt,
    })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
    .innerJoin(subscriptions, eq(subscriptions.organizationId, organizations.id))
    .where(eq(organizationMembers.userId, userId));

  return rows.map((row) => ({
    organizationId: row.organizationId,
    organizationName: row.organizationName,
    organizationSlug: row.organizationSlug,
    role: row.role as Membership["role"],
    plan: row.plan as Membership["plan"],
    onboardedAt: row.onboardedAt ? row.onboardedAt.toISOString() : null,
  }));
}

