import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { getDb, schema } from "@/db";

export function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export function generateKey() {
  const key = `ak_live_${randomBytes(24).toString("base64url")}`;
  return { key, prefix: key.slice(0, 12), hash: hashKey(key) };
}

/** Resolve a bearer token to the owning user id, or null. */
export async function userIdForKey(key: string) {
  if (!key.startsWith("ak_live_")) return null;
  const db = await getDb();
  const [row] = await db
    .select({ id: schema.apiKeys.id, userId: schema.apiKeys.userId })
    .from(schema.apiKeys)
    .where(and(eq(schema.apiKeys.hash, hashKey(key)), isNull(schema.apiKeys.revokedAt)));
  if (!row) return null;
  await db.update(schema.apiKeys).set({ lastUsedAt: new Date() }).where(eq(schema.apiKeys.id, row.id));
  return row.userId;
}
