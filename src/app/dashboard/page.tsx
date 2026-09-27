import Image from "next/image";
import { headers } from "next/headers";
import { auth, currentUser } from "@clerk/nextjs/server";
import { and, desc, eq, gte, isNull } from "drizzle-orm";
import { ShieldAlert, CalendarClock } from "lucide-react";
import { getDb, schema } from "@/db";
import { CHAINS } from "@/lib/chains";
import { nextChargeDate, type Cadence } from "@/lib/cadence";
import { timeAgo } from "@/lib/format";
import { PortfolioProvider } from "@/components/dashboard/portfolio";
import { ValueCard } from "@/components/dashboard/value-card";
import { BreakerCard } from "@/components/dashboard/breaker-card";
import { WalletsCard } from "@/components/dashboard/wallets-card";
import { ActivityCard } from "@/components/dashboard/activity-card";
import { CheckCard } from "@/components/dashboard/check-card";
import { SubscriptionsCard } from "@/components/dashboard/subscriptions-card";
import { ApiKeysCard } from "@/components/dashboard/api-keys-card";
import type { ChainOption, SubscriptionView, WalletView } from "@/components/dashboard/types";

export default async function DashboardPage() {
  const { userId } = await auth.protect();
  const user = await currentUser();
  const { now, walletRows, subRows, settingsRows, eventRows, recent24h, trippedAll, keyRows } = await loadDashboard(userId);

  const settings = settingsRows[0] ?? { armed: true, sensitivity: 60 };
  const latencies = recent24h.map((e) => e.latencyMs).sort((a, b) => a - b);
  const median = latencies.length ? latencies[Math.floor(latencies.length / 2)] : null;

  const wallets: WalletView[] = walletRows.map((w) => ({ id: w.id, label: w.label, address: w.address, verified: w.verified }));
  const subscriptions: SubscriptionView[] = subRows.map((s) => ({
    id: s.id,
    walletId: s.walletId,
    merchant: s.merchant,
    payee: s.payee,
    chainId: s.chainId,
    token: s.token,
    amount: s.amount,
    cap: s.cap,
    cadence: s.cadence,
    status: s.status as SubscriptionView["status"],
    nextCharge: nextChargeDate(s.startedAt, s.cadence as Cadence, s.lastChargedAt).toISOString(),
    lastChargedAt: s.lastChargedAt?.toISOString() ?? null,
  }));
  const chains: ChainOption[] = CHAINS.map((c) => ({ id: c.id, name: c.name, native: c.native.symbol, tokens: c.tokens }));
  const active = subscriptions.filter((s) => s.status === "active");

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const name = user?.firstName ?? user?.username ?? "there";

  return (
    <PortfolioProvider walletKey={wallets.map((w) => w.address).join(",")}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3 px-1">
          <div>
            <p className="text-sm text-muted">Hi {name} 👋</p>
            <h1 className="text-3xl font-bold tracking-tight">Your protection overview</h1>
          </div>
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
              wallets.length === 0
                ? "bg-line text-muted"
                : settings.armed
                  ? "bg-mint-100 text-mint-600"
                  : "bg-peach-100 text-peach-600"
            }`}
          >
            <span
              className={`size-2 rounded-full ${wallets.length === 0 ? "bg-muted" : settings.armed ? "bg-mint-400" : "bg-peach-500"}`}
            />
            {wallets.length === 0 ? "No wallets connected" : settings.armed ? "All wallets guarded" : "Breaker disarmed"}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <BreakerCard
            armed={settings.armed}
            sensitivity={settings.sensitivity}
            stats={{
              checks24h: recent24h.length,
              tripped24h: recent24h.filter((e) => e.verdict === "tripped").length,
              medianLatencyMs: median,
              wallets: wallets.length,
            }}
          />
          <ValueCard walletCount={wallets.length} />
          <section className="bento flex min-h-[170px] flex-col justify-between p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted">Active subscriptions</p>
              <CalendarClock className="size-5 text-peach-500" />
            </div>
            <div>
              <p className="text-3xl font-bold tracking-tight">{active.length}</p>
              <p className="mt-1 text-xs text-muted">
                {subscriptions.length - active.length > 0
                  ? `${subscriptions.length - active.length} paused or revoked`
                  : "Approved merchants with spending caps"}
              </p>
            </div>
          </section>
          <section className="bento flex min-h-[170px] flex-col justify-between bg-gradient-to-br from-peach-400 to-peach-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/80">Trips, all time</p>
              <ShieldAlert className="size-5" />
            </div>
            <div>
              <p className="text-3xl font-bold tracking-tight">{trippedAll.length}</p>
              <p className="mt-1 text-xs text-white/80">Risky requests the breaker stopped</p>
            </div>
          </section>
          <section className="bento flex min-h-[170px] flex-col justify-end bg-[#f6ebe3] p-5">
            <Image src="/drainer-blocked.png" alt="Drainer deflected by a shield" width={1024} height={1024} className="absolute inset-0 size-full object-cover" />
            <span className="glass relative z-10 w-fit rounded-xl px-3 py-1.5 text-xs font-semibold">
              {trippedAll[0] ? `Last trip: ${timeAgo(trippedAll[0].createdAt)}` : "No trips yet"}
            </span>
          </section>

          <WalletsCard wallets={wallets} />
          <ActivityCard events={eventRows} now={now} />
          <CheckCard wallets={wallets} chains={chains} subscriptions={subscriptions} />
          <ApiKeysCard
            keys={keyRows.map((k) => ({
              id: k.id,
              name: k.name,
              prefix: k.prefix,
              createdAt: k.createdAt.toISOString(),
              lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
            }))}
            origin={origin}
          />
          <SubscriptionsCard subscriptions={subscriptions} wallets={wallets} chains={chains} />
        </div>
      </div>
    </PortfolioProvider>
  );
}

async function loadDashboard(userId: string) {
  const db = await getDb();
  const now = Date.now();
  const dayAgo = new Date(now - 86_400_000);

  const [walletRows, subRows, settingsRows, eventRows, recent24h, trippedAll, keyRows] = await Promise.all([
    db.select().from(schema.wallets).where(eq(schema.wallets.userId, userId)).orderBy(schema.wallets.createdAt),
    db.select().from(schema.subscriptions).where(eq(schema.subscriptions.userId, userId)).orderBy(schema.subscriptions.createdAt),
    db.select().from(schema.breakerSettings).where(eq(schema.breakerSettings.userId, userId)),
    db.select().from(schema.events).where(eq(schema.events.userId, userId)).orderBy(desc(schema.events.createdAt)).limit(25),
    db
      .select({ verdict: schema.events.verdict, latencyMs: schema.events.latencyMs })
      .from(schema.events)
      .where(and(eq(schema.events.userId, userId), gte(schema.events.createdAt, dayAgo))),
    db
      .select({ createdAt: schema.events.createdAt })
      .from(schema.events)
      .where(and(eq(schema.events.userId, userId), eq(schema.events.verdict, "tripped")))
      .orderBy(desc(schema.events.createdAt)),
    db
      .select()
      .from(schema.apiKeys)
      .where(and(eq(schema.apiKeys.userId, userId), isNull(schema.apiKeys.revokedAt)))
      .orderBy(desc(schema.apiKeys.createdAt)),
  ]);

  return { now, walletRows, subRows, settingsRows, eventRows, recent24h, trippedAll, keyRows };
}
