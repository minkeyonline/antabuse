"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { and, eq, gt } from "drizzle-orm";
import { getAddress, isAddress, parseUnits, verifyMessage } from "viem";
import { getDb, schema } from "@/db";
import { getChain } from "@/lib/chains";
import { generateKey } from "@/lib/api-keys";
import { CheckError, runCheck, type CheckInput, type CheckResult } from "@/lib/risk-engine";

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string };

async function requireUser() {
  const { userId } = await auth();
  if (!userId) throw new Error("Not signed in");
  return userId;
}

function fail(error: unknown): { ok: false; error: string } {
  if (error instanceof CheckError || error instanceof Error) return { ok: false, error: error.message };
  return { ok: false, error: "Something went wrong" };
}

function done() {
  revalidatePath("/dashboard");
}

/* ---------------- Wallets ---------------- */

export async function createWalletChallenge(address: string): Promise<ActionResult<{ message: string }>> {
  try {
    const userId = await requireUser();
    if (!isAddress(address)) throw new Error("Invalid address");
    const checksummed = getAddress(address);
    const message = [
      "Antabuse wants you to verify ownership of this wallet.",
      "",
      `Wallet: ${checksummed}`,
      `Nonce: ${randomBytes(12).toString("hex")}`,
      `Issued: ${new Date().toISOString()}`,
      "",
      "Signing is free and does not send a transaction.",
    ].join("\n");
    const db = await getDb();
    await db.insert(schema.walletChallenges).values({
      userId,
      address: checksummed,
      message,
      expiresAt: new Date(Date.now() + 10 * 60_000),
    });
    return { ok: true, data: { message } };
  } catch (e) {
    return fail(e);
  }
}

export async function verifyWallet(input: {
  address: string;
  message: string;
  signature: `0x${string}`;
  label: string;
}): Promise<ActionResult> {
  try {
    const userId = await requireUser();
    const address = getAddress(input.address);
    const db = await getDb();
    const [challenge] = await db
      .select()
      .from(schema.walletChallenges)
      .where(
        and(
          eq(schema.walletChallenges.userId, userId),
          eq(schema.walletChallenges.address, address),
          eq(schema.walletChallenges.message, input.message),
          gt(schema.walletChallenges.expiresAt, new Date()),
        ),
      );
    if (!challenge) throw new Error("Verification expired. Try again.");
    const valid = await verifyMessage({ address, message: input.message, signature: input.signature });
    if (!valid) throw new Error("Signature does not match this wallet");

    await db.delete(schema.walletChallenges).where(eq(schema.walletChallenges.id, challenge.id));
    await db
      .insert(schema.wallets)
      .values({ userId, address, label: input.label.trim() || "My wallet", verified: true })
      .onConflictDoUpdate({
        target: [schema.wallets.userId, schema.wallets.address],
        set: { verified: true },
      });
    done();
    return { ok: true, data: null };
  } catch (e) {
    return fail(e);
  }
}

export async function addWatchWallet(input: { address: string; label: string }): Promise<ActionResult> {
  try {
    const userId = await requireUser();
    if (!isAddress(input.address)) throw new Error("Enter a valid 0x address");
    const db = await getDb();
    await db
      .insert(schema.wallets)
      .values({ userId, address: getAddress(input.address), label: input.label.trim() || "Watched wallet" })
      .onConflictDoNothing();
    done();
    return { ok: true, data: null };
  } catch (e) {
    return fail(e);
  }
}

export async function removeWallet(id: string): Promise<ActionResult> {
  try {
    const userId = await requireUser();
    const db = await getDb();
    await db.delete(schema.wallets).where(and(eq(schema.wallets.id, id), eq(schema.wallets.userId, userId)));
    done();
    return { ok: true, data: null };
  } catch (e) {
    return fail(e);
  }
}

/* ---------------- Subscriptions ---------------- */

export async function createSubscription(input: {
  walletId: string;
  merchant: string;
  payee: string;
  chainId: number;
  token: string;
  amount: string;
  cap: string;
  cadence: string;
}): Promise<ActionResult> {
  try {
    const userId = await requireUser();
    const db = await getDb();
    const [wallet] = await db
      .select()
      .from(schema.wallets)
      .where(and(eq(schema.wallets.id, input.walletId), eq(schema.wallets.userId, userId)));
    if (!wallet) throw new Error("Choose one of your wallets");
    if (!input.merchant.trim()) throw new Error("Merchant name is required");
    if (!isAddress(input.payee)) throw new Error("Payee must be a valid 0x address");
    if (!getChain(input.chainId)) throw new Error("Unsupported chain");
    if (!["USDC", "USDT", "NATIVE"].includes(input.token)) throw new Error("Unsupported token");
    if (!["weekly", "monthly", "yearly"].includes(input.cadence)) throw new Error("Unsupported cadence");
    const decimals = input.token === "NATIVE" ? 18 : 6;
    let amount: bigint, cap: bigint;
    try {
      amount = parseUnits(input.amount, decimals);
      cap = parseUnits(input.cap || input.amount, decimals);
    } catch {
      throw new Error("Amount and cap must be numbers");
    }
    if (amount <= 0n) throw new Error("Amount must be greater than 0");
    if (cap < amount) throw new Error("Cap must be at least the charge amount");

    await db.insert(schema.subscriptions).values({
      userId,
      walletId: wallet.id,
      merchant: input.merchant.trim(),
      payee: getAddress(input.payee),
      chainId: input.chainId,
      token: input.token,
      amount: input.amount,
      cap: input.cap || input.amount,
      cadence: input.cadence,
    });
    done();
    return { ok: true, data: null };
  } catch (e) {
    return fail(e);
  }
}

export async function setSubscriptionStatus(id: string, status: "active" | "paused" | "revoked"): Promise<ActionResult> {
  try {
    const userId = await requireUser();
    const db = await getDb();
    await db
      .update(schema.subscriptions)
      .set({ status })
      .where(and(eq(schema.subscriptions.id, id), eq(schema.subscriptions.userId, userId)));
    done();
    return { ok: true, data: null };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteSubscription(id: string): Promise<ActionResult> {
  try {
    const userId = await requireUser();
    const db = await getDb();
    await db
      .delete(schema.subscriptions)
      .where(and(eq(schema.subscriptions.id, id), eq(schema.subscriptions.userId, userId)));
    done();
    return { ok: true, data: null };
  } catch (e) {
    return fail(e);
  }
}

/* ---------------- Breaker ---------------- */

export async function updateBreaker(input: { armed?: boolean; sensitivity?: number }): Promise<ActionResult> {
  try {
    const userId = await requireUser();
    const set: { armed?: boolean; sensitivity?: number; updatedAt: Date } = { updatedAt: new Date() };
    if (typeof input.armed === "boolean") set.armed = input.armed;
    if (typeof input.sensitivity === "number") set.sensitivity = Math.max(0, Math.min(100, Math.round(input.sensitivity)));
    const db = await getDb();
    await db
      .insert(schema.breakerSettings)
      .values({ userId, ...set })
      .onConflictDoUpdate({ target: schema.breakerSettings.userId, set });
    done();
    return { ok: true, data: null };
  } catch (e) {
    return fail(e);
  }
}

export async function checkTransaction(input: CheckInput): Promise<ActionResult<CheckResult>> {
  try {
    const userId = await requireUser();
    const result = await runCheck(userId, input, "dashboard");
    done();
    return { ok: true, data: result };
  } catch (e) {
    return fail(e);
  }
}

/* ---------------- API keys ---------------- */

export async function createApiKey(name: string): Promise<ActionResult<{ key: string }>> {
  try {
    const userId = await requireUser();
    const { key, prefix, hash } = generateKey();
    const db = await getDb();
    await db.insert(schema.apiKeys).values({ userId, name: name.trim() || "Default key", prefix, hash });
    done();
    return { ok: true, data: { key } };
  } catch (e) {
    return fail(e);
  }
}

export async function revokeApiKey(id: string): Promise<ActionResult> {
  try {
    const userId = await requireUser();
    const db = await getDb();
    await db
      .update(schema.apiKeys)
      .set({ revokedAt: new Date() })
      .where(and(eq(schema.apiKeys.id, id), eq(schema.apiKeys.userId, userId)));
    done();
    return { ok: true, data: null };
  } catch (e) {
    return fail(e);
  }
}
