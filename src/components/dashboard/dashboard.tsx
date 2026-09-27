"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Activity,
  CalendarClock,
  CircleCheck,
  CircleHelp,
  Pause,
  Play,
  Plus,
  Power,
  ShieldAlert,
  Trash2,
  Wallet as WalletIcon,
  Zap,
} from "lucide-react";
import type {
  FirewallEvent,
  Subscription,
  SubscriptionStatus,
  Wallet,
} from "@/lib/mock-data";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

type Props = {
  greeting: string;
  initialWallets: Wallet[];
  initialSubscriptions: Subscription[];
  events: FirewallEvent[];
};

export function Dashboard({ greeting, initialWallets, initialSubscriptions, events }: Props) {
  const [armed, setArmed] = useState(true);
  const [sensitivity, setSensitivity] = useState(70);
  const [wallets, setWallets] = useState(initialWallets);
  const [subs, setSubs] = useState(initialSubscriptions);

  const totalProtected = wallets.reduce((sum, w) => sum + w.balanceUsd, 0);
  const activeSubs = subs.filter((s) => s.status === "active");
  const tripped = events.filter((e) => e.verdict === "tripped").length;

  function setStatus(id: string, status: SubscriptionStatus) {
    setSubs((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
  }

  function connectWallet() {
    const n = wallets.length + 1;
    const hex = Math.random().toString(16).slice(2, 6);
    setWallets((prev) => [
      ...prev,
      {
        id: `w${n}-${hex}`,
        label: `Wallet ${n}`,
        address: `0x${hex}…${hex.split("").reverse().join("")}`,
        chain: "Polygon",
        balanceUsd: 0,
        risk: "low",
      },
    ]);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <p className="text-sm text-muted">{greeting} 👋</p>
          <h1 className="text-3xl font-bold tracking-tight">Your protection overview</h1>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
            armed ? "bg-mint-100 text-mint-600" : "bg-peach-100 text-peach-600"
          }`}
        >
          <span className={`size-2 rounded-full ${armed ? "bg-mint-400" : "bg-peach-500"}`} />
          {armed ? "All wallets guarded" : "Breaker disarmed"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Circuit breaker */}
        <section
          className={`bento flex flex-col gap-6 p-6 md:col-span-2 lg:row-span-2 ${
            armed ? "bg-ink text-white" : "bg-white"
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className={`text-sm ${armed ? "text-white/60" : "text-muted"}`}>AI Circuit Breaker</p>
              <h2 className="mt-1 text-2xl font-semibold">
                {armed ? "Armed & monitoring" : "Disarmed — you are exposed"}
              </h2>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={armed}
              aria-label="Toggle circuit breaker"
              onClick={() => setArmed((a) => !a)}
              className={`relative grid size-14 place-items-center rounded-2xl transition ${
                armed
                  ? "bg-gradient-to-br from-peach-400 to-peach-600 text-white shadow-float"
                  : "bg-peach-100 text-peach-600"
              }`}
            >
              {armed && <span className="absolute inset-0 rounded-2xl bg-peach-500/40 animate-pulse-ring" />}
              <Power className="relative size-6" />
            </button>
          </div>

          <div className="flex flex-row items-center gap-4">
            <div className="grid flex-1 grid-cols-2 gap-3">
              <Metric dark={armed} label="Tripped (24h)" value={String(tripped)} />
              <Metric dark={armed} label="Median latency" value="38 ms" />
              <Metric dark={armed} label="Chains watched" value="14" />
              <Metric dark={armed} label="Model" value="v4.2" />
            </div>
            <Image
              src="/ai-nodes.png"
              alt="AI node network"
              width={1024}
              height={1024}
              className={`w-2/5 shrink-0 rounded-2xl ${armed ? "opacity-90" : "mix-blend-multiply grayscale"}`}
            />
          </div>

          <label className="flex flex-col gap-2">
            <span className="flex justify-between text-sm">
              <span className={armed ? "text-white/70" : "text-muted"}>Trip sensitivity</span>
              <span className="font-semibold">
                {sensitivity < 40 ? "Relaxed" : sensitivity < 75 ? "Balanced" : "Paranoid"} · {sensitivity}
              </span>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={sensitivity}
              disabled={!armed}
              onChange={(e) => setSensitivity(Number(e.target.value))}
              className="accent-peach-500 disabled:opacity-40"
            />
          </label>
        </section>

        <StatCard icon={WalletIcon} label="Value protected" value={usd.format(totalProtected)} sub={`${wallets.length} wallets connected`} />
        <StatCard icon={CalendarClock} label="Active subscriptions" value={String(activeSubs.length)} sub={`${usd.format(activeSubs.reduce((s, x) => s + (x.asset === "ETH" ? 0 : x.amount), 0))} in stablecoins`} />

        <StatCard icon={ShieldAlert} label="Drainers blocked" value="27" sub="since you joined" accent />
        <section className="bento flex flex-col justify-end bg-[#f6ebe3] p-5 min-h-[170px]">
          <Image src="/drainer-blocked.png" alt="Drainer deflected by shield" width={1024} height={1024} className="absolute inset-0 size-full object-cover" />
          <span className="glass relative z-10 w-fit rounded-xl px-3 py-1.5 text-xs font-semibold">
            Last trip: 2 minutes ago
          </span>
        </section>

        {/* Wallets */}
        <section className="bento flex flex-col gap-4 p-6 md:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Connected wallets</h2>
            <button
              type="button"
              onClick={connectWallet}
              className="inline-flex items-center gap-1.5 rounded-xl bg-ink px-3 py-2 text-xs font-semibold text-white hover:bg-ink/85"
            >
              <Plus className="size-3.5" /> Connect
            </button>
          </div>
          <ul className="flex flex-col divide-y divide-line">
            {wallets.map((w) => (
              <li key={w.id} className="flex items-center gap-3 py-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-peach-100 text-peach-600">
                  <WalletIcon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{w.label}</p>
                  <p className="truncate font-mono text-xs text-muted">
                    {w.address} · {w.chain}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{usd.format(w.balanceUsd)}</p>
                  <RiskBadge risk={w.risk} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Live feed */}
        <section className="bento flex flex-col gap-4 p-6 md:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Firewall activity</h2>
            <Activity className="size-4 text-muted" />
          </div>
          <ul className="flex flex-col gap-2">
            {events.map((e) => (
              <li key={e.id} className="flex items-center gap-3 rounded-2xl bg-canvas/70 px-3 py-2.5">
                <VerdictIcon verdict={e.verdict} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{e.kind}</p>
                  <p className="truncate font-mono text-xs text-muted">{e.target}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold capitalize">{e.verdict}</p>
                  <p className="text-xs text-muted">{e.time} · risk {e.risk.toFixed(2)}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Subscriptions */}
        <section className="bento flex flex-col gap-4 p-6 md:col-span-2 lg:col-span-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Subscriptions</h2>
            <span className="text-xs text-muted">Charges above cap trip the breaker automatically</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="pb-3 font-medium">Merchant</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Cap</th>
                  <th className="pb-3 font-medium">Wallet</th>
                  <th className="pb-3 font-medium">Next charge</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {subs.map((s) => (
                  <tr key={s.id} className={s.status === "revoked" ? "opacity-45" : undefined}>
                    <td className="py-3 font-semibold">{s.merchant}</td>
                    <td className="py-3">
                      {s.amount} {s.asset} <span className="text-muted">/ {s.cadence}</span>
                    </td>
                    <td className="py-3 text-muted">
                      {s.cap} {s.asset}
                    </td>
                    <td className="py-3 text-muted">
                      {wallets.find((w) => w.id === s.walletId)?.label ?? "—"}
                    </td>
                    <td className="py-3 text-muted">{s.status === "active" ? s.nextCharge : "—"}</td>
                    <td className="py-3">
                      <StatusPill status={s.status} />
                    </td>
                    <td className="py-3">
                      <div className="flex justify-end gap-1.5">
                        {s.status !== "revoked" && (
                          <IconButton
                            label={s.status === "active" ? "Pause" : "Resume"}
                            onClick={() => setStatus(s.id, s.status === "active" ? "paused" : "active")}
                          >
                            {s.status === "active" ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                          </IconButton>
                        )}
                        {s.status !== "revoked" && (
                          <IconButton label="Revoke" danger onClick={() => setStatus(s.id, "revoked")}>
                            <Trash2 className="size-3.5" />
                          </IconButton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value, dark }: { label: string; value: string; dark: boolean }) {
  return (
    <div className={`rounded-2xl p-3 ${dark ? "bg-white/5" : "bg-canvas"}`}>
      <p className={`text-xs ${dark ? "text-white/55" : "text-muted"}`}>{label}</p>
      <p className="mt-1 text-xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <section
      className={`bento flex min-h-[170px] flex-col justify-between p-6 ${
        accent ? "bg-gradient-to-br from-peach-400 to-peach-600 text-white" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <p className={`text-sm ${accent ? "text-white/80" : "text-muted"}`}>{label}</p>
        <Icon className={`size-5 ${accent ? "" : "text-peach-500"}`} />
      </div>
      <div>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        <p className={`mt-1 text-xs ${accent ? "text-white/80" : "text-muted"}`}>{sub}</p>
      </div>
    </section>
  );
}

function RiskBadge({ risk }: { risk: Wallet["risk"] }) {
  const styles = {
    low: "bg-mint-100 text-mint-600",
    medium: "bg-peach-100 text-peach-600",
    high: "bg-red-100 text-red-600",
  } as const;
  return (
    <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${styles[risk]}`}>
      {risk} risk
    </span>
  );
}

function StatusPill({ status }: { status: SubscriptionStatus }) {
  const styles = {
    active: "bg-mint-100 text-mint-600",
    paused: "bg-peach-100 text-peach-600",
    revoked: "bg-line text-muted",
  } as const;
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${styles[status]}`}>
      {status}
    </span>
  );
}

function VerdictIcon({ verdict }: { verdict: FirewallEvent["verdict"] }) {
  if (verdict === "allowed")
    return (
      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-mint-100 text-mint-600">
        <CircleCheck className="size-4" />
      </span>
    );
  if (verdict === "tripped")
    return (
      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-peach-500 text-white">
        <Zap className="size-4" fill="currentColor" />
      </span>
    );
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-peach-100 text-peach-600">
      <CircleHelp className="size-4" />
    </span>
  );
}

function IconButton({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`grid size-8 place-items-center rounded-lg border border-line transition ${
        danger ? "hover:border-red-200 hover:bg-red-50 hover:text-red-600" : "hover:bg-canvas"
      }`}
    >
      {children}
    </button>
  );
}
