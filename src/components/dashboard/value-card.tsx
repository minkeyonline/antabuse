"use client";

import { RefreshCw, Wallet } from "lucide-react";
import { usd } from "@/lib/format";
import { usePortfolio } from "./portfolio";

export function ValueCard({ walletCount }: { walletCount: number }) {
  const { loading, totalUsd, error, refresh } = usePortfolio();
  return (
    <section className="bento flex min-h-[170px] flex-col justify-between p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">Value protected</p>
        <button type="button" onClick={refresh} aria-label="Refresh balances" className="text-peach-500 hover:text-peach-600">
          {loading ? <RefreshCw className="size-5 animate-spin" /> : <Wallet className="size-5" />}
        </button>
      </div>
      <div>
        <p className="text-3xl font-bold tracking-tight">
          {walletCount === 0 ? "—" : loading && totalUsd == null ? "Loading…" : totalUsd != null ? usd.format(totalUsd) : "Unavailable"}
        </p>
        <p className="mt-1 text-xs text-muted">
          {error
            ? error
            : walletCount === 0
              ? "Connect a wallet to see live balances"
              : `Live on-chain balance · ${walletCount} wallet${walletCount === 1 ? "" : "s"}`}
        </p>
      </div>
    </section>
  );
}
