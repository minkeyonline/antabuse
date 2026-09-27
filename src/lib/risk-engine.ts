import "server-only";
import {
  decodeFunctionData,
  erc20Abi,
  formatUnits,
  getAddress,
  isAddress,
  parseAbi,
  parseUnits,
  type Address,
  type Hex,
} from "viem";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Reason, SubscriptionRow } from "@/db/schema";
import { TOKEN_DECIMALS, chainName, getChain, getClient, tokenSymbolFor } from "./chains";
import { currentPeriodStart, type Cadence } from "./cadence";

export type Verdict = "allowed" | "challenged" | "tripped";

export type CheckInput = {
  wallet: string;
  chainId: number;
  transaction?: { to: string; data?: string; value?: string };
  typedData?: {
    domain?: Record<string, unknown>;
    primaryType: string;
    message: Record<string, unknown>;
  };
};

export type CheckResult = {
  eventId: string;
  verdict: Verdict;
  risk: number;
  action: string;
  target: string;
  reasons: Reason[];
  subscription: { id: string; merchant: string } | null;
  breaker: { armed: boolean; sensitivity: number; tripAt: number; challengeAt: number };
  latencyMs: number;
};

export class CheckError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

const ACTION_ABI = parseAbi([
  "function approve(address spender, uint256 amount)",
  "function increaseAllowance(address spender, uint256 addedValue)",
  "function setApprovalForAll(address operator, bool approved)",
  "function transfer(address to, uint256 amount)",
  "function transferFrom(address from, address to, uint256 amount)",
  "function safeTransferFrom(address from, address to, uint256 tokenId)",
  "function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)",
]);

const UNLIMITED = 2n ** 128n; // anything this large is effectively "infinite"
const DRAIN_SHARE = 0.9;

/** Map sensitivity 0–100 to risk thresholds. Higher sensitivity trips earlier. */
export function thresholds(sensitivity: number) {
  const tripAt = +(0.9 - (0.6 * sensitivity) / 100).toFixed(2);
  const challengeAt = +Math.max(0.1, tripAt - 0.2).toFixed(2);
  return { tripAt, challengeAt };
}

function short(a: string) {
  return isAddress(a) ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

async function isEoa(chainId: number, address: Address) {
  const client = getClient(chainId);
  if (!client) return undefined;
  try {
    const code = await client.getCode({ address });
    return !code || code === "0x";
  } catch {
    return undefined;
  }
}

async function tokenBalance(chainId: number, token: Address | "native", owner: Address) {
  const client = getClient(chainId);
  if (!client) return undefined;
  try {
    if (token === "native") return await client.getBalance({ address: owner });
    return await client.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [owner] });
  } catch {
    return undefined;
  }
}

function toAddress(v: unknown, field: string): Address {
  if (typeof v !== "string" || !isAddress(v)) throw new CheckError(`${field} must be a valid address`);
  return getAddress(v);
}

function toBigInt(v: unknown, field: string): bigint {
  try {
    if (typeof v === "bigint") return v;
    if (typeof v === "number" || typeof v === "string") return BigInt(v);
  } catch {}
  throw new CheckError(`${field} must be an integer`);
}

type Ctx = {
  wallet: Address;
  chainId: number;
  subs: SubscriptionRow[];
  reasons: Reason[];
  matched: SubscriptionRow | null;
  /** When a charge exactly matches an active subscription, the verdict is decided by subscription rules alone. */
  subscriptionVerdict: number | null;
};

function add(ctx: Ctx, code: string, message: string, weight: number) {
  ctx.reasons.push({ code, message, weight });
}

function tokenUnits(sub: SubscriptionRow, field: "amount" | "cap") {
  return parseUnits(sub[field], sub.token === "NATIVE" ? 18 : TOKEN_DECIMALS);
}

function subsFor(ctx: Ctx, payee: Address, token: string) {
  return ctx.subs.filter((s) => s.payee === payee && s.token === token && s.chainId === ctx.chainId);
}

/** Evaluate a direct payment (ERC-20 transfer or native send) against the user's subscriptions. */
function checkCharge(ctx: Ctx, payee: Address, token: string, amount: bigint) {
  const candidates = subsFor(ctx, payee, token);
  if (candidates.length === 0) return false;
  const sub = candidates.find((s) => s.status === "active") ?? candidates[0];
  ctx.matched = sub;
  const unit = token === "NATIVE" ? (getChain(ctx.chainId)?.native.symbol ?? "native") : token;

  if (sub.status === "revoked") {
    add(ctx, "subscription_revoked", `${sub.merchant} subscription was revoked`, 0.95);
    ctx.subscriptionVerdict = 0.95;
    return true;
  }
  if (sub.status === "paused") {
    add(ctx, "subscription_paused", `${sub.merchant} subscription is paused`, 0.85);
    ctx.subscriptionVerdict = 0.85;
    return true;
  }
  const cap = tokenUnits(sub, "cap");
  if (amount > cap) {
    add(
      ctx,
      "over_cap",
      `Charge of ${formatUnits(amount, token === "NATIVE" ? 18 : TOKEN_DECIMALS)} ${unit} exceeds ${sub.merchant}'s cap of ${sub.cap} ${unit}`,
      0.9,
    );
    ctx.subscriptionVerdict = 0.9;
    return true;
  }
  const periodStart = currentPeriodStart(sub.startedAt, sub.cadence as Cadence);
  if (sub.lastChargedAt && sub.lastChargedAt >= periodStart) {
    add(ctx, "already_charged", `${sub.merchant} was already charged this ${sub.cadence.replace("ly", "")}`, 0.7);
    ctx.subscriptionVerdict = 0.7;
    return true;
  }
  add(ctx, "subscription_match", `Matches active ${sub.merchant} subscription within cap`, 0);
  ctx.subscriptionVerdict = 0.02;
  return true;
}

async function checkSpender(ctx: Ctx, spender: Address, amount: bigint | null, token: string | undefined, kind: string) {
  const known = token ? subsFor(ctx, spender, token).find((s) => s.status === "active") : undefined;
  if (known) ctx.matched = known;

  if (amount === null || amount >= UNLIMITED) {
    add(
      ctx,
      "unlimited_approval",
      known
        ? `Unlimited ${kind} to ${known.merchant}. Use a capped approval instead`
        : `Unlimited ${kind} to ${short(spender)}`,
      known ? 0.35 : 0.45,
    );
  } else if (known && amount <= tokenUnits(known, "cap")) {
    add(ctx, "approval_within_cap", `${kind} to ${known.merchant} is within the subscription cap`, 0);
    ctx.subscriptionVerdict = 0.05;
    return;
  } else {
    add(ctx, "unknown_spender", `${kind} to ${short(spender)}, which is not an approved merchant`, 0.25);
  }

  if (await isEoa(ctx.chainId, spender)) {
    add(ctx, "spender_eoa", `Spender ${short(spender)} is a plain wallet, not a contract`, 0.35);
  }
}

async function drainCheck(ctx: Ctx, token: Address | "native", amount: bigint, label: string) {
  if (amount === 0n) return;
  const bal = await tokenBalance(ctx.chainId, token, ctx.wallet);
  if (bal === undefined || bal === 0n) return;
  if (amount * 100n >= bal * BigInt(DRAIN_SHARE * 100)) {
    add(ctx, "drains_balance", `Moves ${amount >= bal ? "all" : "≥90%"} of the wallet's ${label} balance`, 0.5);
  }
}

async function analyzeTransaction(ctx: Ctx, tx: NonNullable<CheckInput["transaction"]>) {
  const to = toAddress(tx.to, "transaction.to");
  const value = tx.value ? toBigInt(tx.value, "transaction.value") : 0n;
  const data = (tx.data ?? "0x") as Hex;
  const token = tokenSymbolFor(ctx.chainId, to);
  const nativeSymbol = getChain(ctx.chainId)?.native.symbol ?? "native";

  if (data === "0x" || data.length < 10) {
    const matched = checkCharge(ctx, to, "NATIVE", value);
    if (!matched) {
      add(ctx, "unknown_recipient", `Sends ${formatUnits(value, 18)} ${nativeSymbol} to ${short(to)}`, 0.1);
      await drainCheck(ctx, "native", value, nativeSymbol);
    }
    return { action: `Send ${nativeSymbol}`, target: to };
  }

  let decoded: ReturnType<typeof decodeFunctionData<typeof ACTION_ABI>> | undefined;
  try {
    decoded = decodeFunctionData({ abi: ACTION_ABI, data });
  } catch {
    decoded = undefined;
  }

  if (value > 0n) await drainCheck(ctx, "native", value, nativeSymbol);

  if (!decoded) {
    add(ctx, "unknown_call", `Unrecognized call (${data.slice(0, 10)}) to ${short(to)}`, 0.2);
    if (await isEoa(ctx.chainId, to)) add(ctx, "data_to_eoa", "Calldata sent to an address with no contract code", 0.3);
    return { action: "Contract call", target: to };
  }

  switch (decoded.functionName) {
    case "approve":
    case "increaseAllowance": {
      const [spender, amount] = decoded.args;
      await checkSpender(ctx, spender, amount, token, "token approval");
      return { action: decoded.functionName, target: spender };
    }
    case "setApprovalForAll": {
      const [operator, approved] = decoded.args;
      if (!approved) {
        add(ctx, "revoke", `Revokes operator ${short(operator)}`, 0);
        return { action: "Revoke operator", target: operator };
      }
      add(ctx, "approval_for_all", `Grants ${short(operator)} control of every NFT in this collection`, 0.65);
      if (await isEoa(ctx.chainId, operator)) add(ctx, "spender_eoa", `Operator ${short(operator)} is a plain wallet`, 0.35);
      return { action: "setApprovalForAll", target: operator };
    }
    case "transfer": {
      const [recipient, amount] = decoded.args;
      const matched = token ? checkCharge(ctx, recipient, token, amount) : false;
      if (!matched) {
        add(ctx, "unknown_recipient", `Token transfer to ${short(recipient)}, not an approved merchant`, 0.15);
        await drainCheck(ctx, to, amount, token ?? "token");
      }
      return { action: token ? `Transfer ${token}` : "Token transfer", target: recipient };
    }
    case "transferFrom":
    case "safeTransferFrom": {
      const [from, recipient] = decoded.args;
      if (from === ctx.wallet) {
        add(ctx, "pull_from_wallet", `Pulls assets out of this wallet to ${short(recipient)}`, 0.45);
        if (decoded.functionName === "transferFrom") await drainCheck(ctx, to, decoded.args[2], token ?? "token");
      } else {
        add(ctx, "third_party_transfer", "Transfers assets between other addresses", 0.1);
      }
      return { action: decoded.functionName, target: recipient };
    }
    case "permit": {
      const [, spender, amount, deadline] = decoded.args;
      await checkSpender(ctx, spender, amount, token, "permit");
      checkDeadline(ctx, deadline);
      return { action: "permit", target: spender };
    }
  }
}

function checkDeadline(ctx: Ctx, deadline: bigint) {
  const oneYear = BigInt(Math.floor(Date.now() / 1000) + 365 * 86400);
  if (deadline > oneYear) add(ctx, "long_deadline", "Signature stays valid for more than a year", 0.15);
}

async function analyzeTypedData(ctx: Ctx, td: NonNullable<CheckInput["typedData"]>) {
  const m = td.message ?? {};
  const verifying = typeof td.domain?.verifyingContract === "string" ? td.domain.verifyingContract : "";
  const token = verifying && isAddress(verifying) ? tokenSymbolFor(ctx.chainId, verifying) : undefined;

  switch (td.primaryType) {
    case "Permit": {
      const spender = toAddress(m.spender, "message.spender");
      await checkSpender(ctx, spender, toBigInt(m.value, "message.value"), token, "permit signature");
      if (m.deadline != null) checkDeadline(ctx, toBigInt(m.deadline, "message.deadline"));
      return { action: "Permit signature", target: spender };
    }
    case "PermitSingle":
    case "PermitBatch": {
      const spender = toAddress(m.spender, "message.spender");
      const details = (Array.isArray(m.details) ? m.details : [m.details]) as Record<string, unknown>[];
      const maxUint160 = 2n ** 160n - 1n;
      for (const d of details) {
        const amount = toBigInt(d?.amount ?? 0, "details.amount");
        const t = typeof d?.token === "string" ? tokenSymbolFor(ctx.chainId, d.token) : undefined;
        await checkSpender(ctx, spender, amount >= maxUint160 ? null : amount, t, "Permit2 allowance");
      }
      if (details.length > 1) add(ctx, "batch_permit", `Grants allowances on ${details.length} tokens at once`, 0.3);
      if (m.sigDeadline != null) checkDeadline(ctx, toBigInt(m.sigDeadline, "message.sigDeadline"));
      return { action: `Permit2 ${td.primaryType === "PermitBatch" ? "batch" : "allowance"}`, target: spender };
    }
    case "OrderComponents": {
      const consideration = (Array.isArray(m.consideration) ? m.consideration : []) as Record<string, unknown>[];
      const toWallet = consideration.filter(
        (c) => typeof c.recipient === "string" && c.recipient.toLowerCase() === ctx.wallet.toLowerCase(),
      );
      const paidToWallet = toWallet.reduce((s, c) => s + toBigInt(c.startAmount ?? 0, "startAmount"), 0n);
      if (toWallet.length === 0 || paidToWallet === 0n) {
        add(ctx, "free_listing", "Marketplace order gives your assets away and pays you nothing", 0.9);
      } else {
        add(ctx, "marketplace_order", "Marketplace listing signature", 0.15);
      }
      return { action: "Seaport order", target: verifying || "Seaport" };
    }
    default:
      add(ctx, "unknown_signature", `Unrecognized signature request (${td.primaryType})`, 0.25);
      return { action: `Sign ${td.primaryType}`, target: verifying || "unknown" };
  }
}

/** Run the circuit breaker for one request and record it as an event. */
export async function runCheck(userId: string, input: CheckInput, source: "api" | "dashboard"): Promise<CheckResult> {
  const started = performance.now();
  const db = await getDb();

  const wallet = toAddress(input.wallet, "wallet");
  const chainId = Number(input.chainId);
  if (!getChain(chainId)) throw new CheckError(`Unsupported chainId ${input.chainId}`);
  if (!input.transaction && !input.typedData) throw new CheckError("Provide either transaction or typedData");

  const [walletRow] = await db
    .select()
    .from(schema.wallets)
    .where(and(eq(schema.wallets.userId, userId), eq(schema.wallets.address, wallet)));
  if (!walletRow) throw new CheckError("Wallet is not registered to this account", 404);

  const [settings] = await db.select().from(schema.breakerSettings).where(eq(schema.breakerSettings.userId, userId));
  const armed = settings?.armed ?? true;
  const sensitivity = settings?.sensitivity ?? 60;
  const subs = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.walletId, walletRow.id));

  const ctx: Ctx = { wallet, chainId, subs, reasons: [], matched: null, subscriptionVerdict: null };
  const { action, target } = input.transaction
    ? await analyzeTransaction(ctx, input.transaction)
    : await analyzeTypedData(ctx, input.typedData!);

  // Combine independent signals: risk = 1 − Π(1 − wᵢ).
  const combined = 1 - ctx.reasons.reduce((p, r) => p * (1 - r.weight), 1);
  const risk = +(ctx.subscriptionVerdict ?? combined).toFixed(2);

  const { tripAt, challengeAt } = thresholds(sensitivity);
  let verdict: Verdict = risk >= tripAt ? "tripped" : risk >= challengeAt ? "challenged" : "allowed";
  if (!armed && verdict !== "allowed") {
    ctx.reasons.push({ code: "disarmed", message: `Breaker disarmed: would have ${verdict === "tripped" ? "tripped" : "challenged"}`, weight: 0 });
    verdict = "allowed";
  }

  const isCharge = ctx.matched && ctx.reasons.some((r) => r.code === "subscription_match");
  if (verdict === "allowed" && isCharge) {
    await db
      .update(schema.subscriptions)
      .set({ lastChargedAt: new Date() })
      .where(eq(schema.subscriptions.id, ctx.matched!.id));
  }

  const latencyMs = Math.round(performance.now() - started);
  const [event] = await db
    .insert(schema.events)
    .values({
      userId,
      walletAddress: wallet,
      chainId,
      action,
      target,
      verdict,
      risk,
      reasons: ctx.reasons,
      armed,
      source,
      latencyMs,
      subscriptionId: ctx.matched?.id ?? null,
    })
    .returning({ id: schema.events.id });

  return {
    eventId: event.id,
    verdict,
    risk,
    action,
    target,
    reasons: ctx.reasons,
    subscription: ctx.matched ? { id: ctx.matched.id, merchant: ctx.matched.merchant } : null,
    breaker: { armed, sensitivity, tripAt, challengeAt },
    latencyMs,
  };
}

export { chainName };
