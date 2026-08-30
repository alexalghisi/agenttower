import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { apiKeys } from "@/lib/db/schema";
import { randomToken, sha256Hex } from "@/lib/crypto";
import { newId } from "@/lib/utils";

export function generateApiKey(): { plaintext: string; prefix: string; hash: string } {
  const secret = randomToken(24);
  const plaintext = `at_live_${secret}`;
  return {
    plaintext,
    prefix: plaintext.slice(0, 16),
    hash: sha256Hex(plaintext),
  };
}

export async function createApiKey(input: {
  organizationId: string;
  projectId?: string | null;
  name: string;
  createdByUserId?: string | null;
}) {
  const db = await getDb();
  const generated = generateApiKey();
  const id = newId();
  await db.insert(apiKeys).values({
    id,
    organizationId: input.organizationId,
    projectId: input.projectId ?? null,
    name: input.name,
    prefix: generated.prefix,
    keyHash: generated.hash,
    createdByUserId: input.createdByUserId ?? null,
  });
  return { id, prefix: generated.prefix, plaintext: generated.plaintext };
}

export async function authenticateApiKey(bearer: string | null) {
  if (!bearer) return null;
  const token = bearer.startsWith("Bearer ") ? bearer.slice(7).trim() : bearer.trim();
  if (!token.startsWith("at_live_")) return null;

  const db = await getDb();
  const rows = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, sha256Hex(token)), isNull(apiKeys.revokedAt)))
    .limit(1);

  const key = rows[0];
  if (!key) return null;

  await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, key.id));
  return key;
}
