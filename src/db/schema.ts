import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const wallets = pgTable(
  "wallets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    address: text("address").notNull(), // checksummed
    label: text("label").notNull(),
    verified: boolean("verified").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("wallets_user_address").on(t.userId, t.address)],
);

export const walletChallenges = pgTable("wallet_challenges", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  address: text("address").notNull(),
  message: text("message").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    walletId: uuid("wallet_id")
      .notNull()
      .references(() => wallets.id, { onDelete: "cascade" }),
    merchant: text("merchant").notNull(),
    payee: text("payee").notNull(), // checksummed address that receives the charge
    chainId: integer("chain_id").notNull(),
    token: text("token").notNull(), // "USDC" | "USDT" | "NATIVE"
    amount: text("amount").notNull(), // decimal string, token units
    cap: text("cap").notNull(), // decimal string, token units
    cadence: text("cadence").notNull(), // "weekly" | "monthly" | "yearly"
    status: text("status").notNull().default("active"), // "active" | "paused" | "revoked"
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    lastChargedAt: timestamp("last_charged_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("subscriptions_user").on(t.userId)],
);

export const breakerSettings = pgTable("breaker_settings", {
  userId: text("user_id").primaryKey(),
  armed: boolean("armed").notNull().default(true),
  sensitivity: integer("sensitivity").notNull().default(60),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Reason = { code: string; message: string; weight: number };

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    walletAddress: text("wallet_address").notNull(),
    chainId: integer("chain_id").notNull(),
    action: text("action").notNull(),
    target: text("target").notNull(),
    verdict: text("verdict").notNull(), // "allowed" | "challenged" | "tripped"
    risk: real("risk").notNull(),
    reasons: jsonb("reasons").$type<Reason[]>().notNull(),
    armed: boolean("armed").notNull(),
    source: text("source").notNull(), // "api" | "dashboard"
    latencyMs: integer("latency_ms").notNull(),
    subscriptionId: uuid("subscription_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("events_user_created").on(t.userId, t.createdAt)],
);

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    prefix: text("prefix").notNull(),
    hash: text("hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("api_keys_hash").on(t.hash)],
);

export type WalletRow = typeof wallets.$inferSelect;
export type SubscriptionRow = typeof subscriptions.$inferSelect;
export type EventRow = typeof events.$inferSelect;
export type ApiKeyRow = typeof apiKeys.$inferSelect;
