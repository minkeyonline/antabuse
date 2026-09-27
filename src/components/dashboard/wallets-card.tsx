"use client";

import { useState, useTransition } from "react";
import { BadgeCheck, Eye, Plus, Trash2, Wallet as WalletIcon, X } from "lucide-react";
import { addWatchWallet, createWalletChallenge, removeWallet, verifyWallet } from "@/app/dashboard/actions";
import { shortAddress, usd } from "@/lib/format";
import { usePortfolio } from "./portfolio";
import type { WalletView } from "./types";
import { Card, CardHeader, Empty, ErrorText, ghostBtn, inputCls, primaryBtn } from "./ui";

type Eip1193 = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };

function injected(): Eip1193 | undefined {
  return (globalThis as unknown as { ethereum?: Eip1193 }).ethereum;
}

export function WalletsCard({ wallets }: { wallets: WalletView[] }) {
  const portfolio = usePortfolio();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setOpen(false);
    setLabel("");
    setAddress("");
    setError(null);
    setStatus(null);
  }

  function connectBrowserWallet() {
    setError(null);
    const provider = injected();
    if (!provider) {
      setError("No browser wallet found. Install MetaMask, Rabby or Coinbase Wallet, or add the address as watch-only.");
      return;
    }
    startTransition(async () => {
      try {
        setStatus("Waiting for wallet…");
        const [account] = (await provider.request({ method: "eth_requestAccounts" })) as string[];
        if (!account) throw new Error("No account selected");
        const challenge = await createWalletChallenge(account);
        if (!challenge.ok) throw new Error(challenge.error);
        setStatus("Sign the message in your wallet to prove ownership…");
        const signature = (await provider.request({
          method: "personal_sign",
          params: [challenge.data.message, account],
        })) as `0x${string}`;
        const r = await verifyWallet({ address: account, message: challenge.data.message, signature, label });
        if (!r.ok) throw new Error(r.error);
        reset();
      } catch (e) {
        setStatus(null);
        setError(e instanceof Error ? e.message : "Wallet connection failed");
      }
    });
  }

  function addWatch() {
    setError(null);
    startTransition(async () => {
      const r = await addWatchWallet({ address, label });
      if (!r.ok) setError(r.error);
      else reset();
    });
  }

  function remove(id: string) {
    if (!confirm("Stop protecting this wallet? Its subscriptions will be deleted too.")) return;
    startTransition(async () => {
      const r = await removeWallet(id);
      if (!r.ok) setError(r.error);
    });
  }

  return (
    <Card className="md:col-span-2">
      <CardHeader
        title="Connected wallets"
        action={
          <button type="button" onClick={() => (open ? reset() : setOpen(true))} className={primaryBtn}>
            {open ? <X className="size-3.5" /> : <Plus className="size-3.5" />} {open ? "Close" : "Add wallet"}
          </button>
        }
      />

      {open && (
        <div className="flex flex-col gap-3 rounded-2xl bg-canvas/70 p-4">
          <input className={inputCls} placeholder="Label (e.g. Main vault)" value={label} onChange={(e) => setLabel(e.target.value)} />
          <button type="button" disabled={pending} onClick={connectBrowserWallet} className={primaryBtn}>
            <BadgeCheck className="size-3.5" /> Connect browser wallet &amp; verify
          </button>
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="h-px flex-1 bg-line" /> or watch any address <span className="h-px flex-1 bg-line" />
          </div>
          <div className="flex gap-2">
            <input className={`${inputCls} font-mono`} placeholder="0x…" value={address} onChange={(e) => setAddress(e.target.value.trim())} />
            <button type="button" disabled={pending || !address} onClick={addWatch} className={ghostBtn}>
              <Eye className="size-3.5" /> Watch
            </button>
          </div>
          {status && <p className="text-xs text-muted">{status}</p>}
          <ErrorText>{error}</ErrorText>
        </div>
      )}
      {!open && <ErrorText>{error}</ErrorText>}

      {wallets.length === 0 ? (
        <Empty>No wallets yet. Add one to start monitoring balances and routing checks through the breaker.</Empty>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {wallets.map((w) => {
            const p = portfolio.wallets[w.address];
            const chains = p ? Array.from(new Set(p.holdings.map((h) => h.chain))) : [];
            return (
              <li key={w.id} className="group flex items-center gap-3 py-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-peach-100 text-peach-600">
                  <WalletIcon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
                    {w.label}
                    {w.verified ? (
                      <BadgeCheck className="size-3.5 text-mint-600" aria-label="Ownership verified" />
                    ) : (
                      <span className="rounded-full bg-line px-1.5 text-[10px] font-medium text-muted">watch-only</span>
                    )}
                  </p>
                  <p className="truncate font-mono text-xs text-muted">
                    {shortAddress(w.address)}
                    {chains.length > 0 && ` · ${chains.join(", ")}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {p ? (p.totalUsd != null ? usd.format(p.totalUsd) : "Price unavailable") : portfolio.loading ? "…" : "—"}
                  </p>
                  {p && p.errors.length > 0 && (
                    <p className="text-[10px] text-muted">RPC unavailable: {p.errors.join(", ")}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => remove(w.id)}
                  aria-label={`Remove ${w.label}`}
                  className="grid size-8 place-items-center rounded-lg text-muted opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 focus:opacity-100"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
