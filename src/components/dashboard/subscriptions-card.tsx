"use client";

import { useState, useTransition } from "react";
import { CalendarClock, Pause, Play, Plus, Trash2, X, Ban } from "lucide-react";
import { createSubscription, deleteSubscription, setSubscriptionStatus } from "@/app/dashboard/actions";
import { shortAddress, shortDate } from "@/lib/format";
import type { ChainOption, SubscriptionView, WalletView } from "./types";
import { Card, CardHeader, Empty, ErrorText, inputCls, primaryBtn } from "./ui";

const statusStyles = {
  active: "bg-mint-100 text-mint-600",
  paused: "bg-peach-100 text-peach-600",
  revoked: "bg-line text-muted",
} as const;

export function SubscriptionsCard({
  subscriptions,
  wallets,
  chains,
}: {
  subscriptions: SubscriptionView[];
  wallets: WalletView[];
  chains: ChainOption[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    walletId: "",
    merchant: "",
    payee: "",
    chainId: chains[0]?.id ?? 1,
    token: "USDC",
    amount: "",
    cap: "",
    cadence: "monthly",
  });

  const chain = chains.find((c) => c.id === form.chainId);
  const unit = (s: SubscriptionView) =>
    s.token === "NATIVE" ? (chains.find((c) => c.id === s.chainId)?.native ?? "native") : s.token;

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await createSubscription({ ...form, walletId: form.walletId || wallets[0]?.id || "" });
      if (!r.ok) setError(r.error);
      else {
        setOpen(false);
        setForm((f) => ({ ...f, merchant: "", payee: "", amount: "", cap: "" }));
      }
    });
  }

  function act(fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Failed");
    });
  }

  return (
    <Card className="md:col-span-2 lg:col-span-4">
      <CardHeader
        title="Subscriptions"
        icon={CalendarClock}
        action={
          <button
            type="button"
            disabled={wallets.length === 0}
            title={wallets.length === 0 ? "Add a wallet first" : undefined}
            onClick={() => setOpen((o) => !o)}
            className={primaryBtn}
          >
            {open ? <X className="size-3.5" /> : <Plus className="size-3.5" />} {open ? "Close" : "Add subscription"}
          </button>
        }
      />
      <p className="-mt-2 text-xs text-muted">
        Charges to an approved payee within the cap, once per period, pass. Anything above the cap, a second charge in the
        same period, or charges to paused or revoked merchants trip the breaker.
      </p>

      {open && (
        <form onSubmit={submit} className="grid gap-3 rounded-2xl bg-canvas/70 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <input className={inputCls} placeholder="Merchant name" value={form.merchant} onChange={(e) => set("merchant", e.target.value)} required />
          <input
            className={`${inputCls} font-mono`}
            placeholder="Payee address 0x…"
            value={form.payee}
            onChange={(e) => set("payee", e.target.value.trim())}
            required
          />
          <select className={inputCls} value={form.walletId || wallets[0]?.id} onChange={(e) => set("walletId", e.target.value)}>
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.label} ({shortAddress(w.address)})
              </option>
            ))}
          </select>
          <select className={inputCls} value={form.chainId} onChange={(e) => set("chainId", Number(e.target.value))}>
            {chains.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select className={inputCls} value={form.token} onChange={(e) => set("token", e.target.value)}>
            <option value="USDC">USDC</option>
            <option value="USDT">USDT</option>
            <option value="NATIVE">{chain?.native ?? "Native"}</option>
          </select>
          <input className={inputCls} inputMode="decimal" placeholder="Amount per charge" value={form.amount} onChange={(e) => set("amount", e.target.value)} required />
          <input className={inputCls} inputMode="decimal" placeholder="Cap (defaults to amount)" value={form.cap} onChange={(e) => set("cap", e.target.value)} />
          <select className={inputCls} value={form.cadence} onChange={(e) => set("cadence", e.target.value)}>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-4">
            <button type="submit" disabled={pending} className={primaryBtn}>
              Save subscription
            </button>
            <ErrorText>{error}</ErrorText>
          </div>
        </form>
      )}
      {!open && <ErrorText>{error}</ErrorText>}

      {subscriptions.length === 0 ? (
        <Empty>
          {wallets.length === 0
            ? "Add a wallet, then approve the merchants allowed to charge it."
            : "No subscriptions yet. Add the merchants you pay on a schedule."}
        </Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="pb-3 font-medium">Merchant</th>
                <th className="pb-3 font-medium">Amount</th>
                <th className="pb-3 font-medium">Cap</th>
                <th className="pb-3 font-medium">Wallet · chain</th>
                <th className="pb-3 font-medium">Next charge</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {subscriptions.map((s) => (
                <tr key={s.id} className={s.status === "revoked" ? "opacity-50" : undefined}>
                  <td className="py-3">
                    <p className="font-semibold">{s.merchant}</p>
                    <p className="font-mono text-xs text-muted">{shortAddress(s.payee)}</p>
                  </td>
                  <td className="py-3">
                    {s.amount} {unit(s)} <span className="text-muted">/ {s.cadence.replace("ly", "")}</span>
                  </td>
                  <td className="py-3 text-muted">
                    {s.cap} {unit(s)}
                  </td>
                  <td className="py-3 text-muted">
                    {wallets.find((w) => w.id === s.walletId)?.label ?? "—"} · {chains.find((c) => c.id === s.chainId)?.name}
                  </td>
                  <td className="py-3 text-muted">{s.status === "active" && s.nextCharge ? shortDate(s.nextCharge) : "—"}</td>
                  <td className="py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[s.status]}`}>{s.status}</span>
                  </td>
                  <td className="py-3">
                    <div className="flex justify-end gap-1.5">
                      {s.status !== "revoked" && (
                        <IconButton
                          label={s.status === "active" ? "Pause" : "Resume"}
                          disabled={pending}
                          onClick={() => act(() => setSubscriptionStatus(s.id, s.status === "active" ? "paused" : "active"))}
                        >
                          {s.status === "active" ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                        </IconButton>
                      )}
                      {s.status !== "revoked" ? (
                        <IconButton label="Revoke" danger disabled={pending} onClick={() => act(() => setSubscriptionStatus(s.id, "revoked"))}>
                          <Ban className="size-3.5" />
                        </IconButton>
                      ) : (
                        <IconButton label="Delete" danger disabled={pending} onClick={() => act(() => deleteSubscription(s.id))}>
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
      )}
    </Card>
  );
}

function IconButton({
  label,
  onClick,
  danger,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`grid size-8 place-items-center rounded-lg border border-line transition disabled:opacity-50 ${
        danger ? "hover:border-red-200 hover:bg-red-50 hover:text-red-600" : "hover:bg-canvas"
      }`}
    >
      {children}
    </button>
  );
}
