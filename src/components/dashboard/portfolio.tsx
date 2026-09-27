"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Holding = { chainId: number; chain: string; symbol: string; amount: number; usd: number | null };
export type WalletPortfolio = { address: string; holdings: Holding[]; totalUsd: number | null; errors: string[] };
type PortfolioState = {
  loading: boolean;
  error: string | null;
  totalUsd: number | null;
  wallets: Record<string, WalletPortfolio>;
  fetchedAt: string | null;
  refresh: () => void;
};

const Ctx = createContext<PortfolioState | null>(null);

export function PortfolioProvider({ walletKey, children }: { walletKey: string; children: ReactNode }) {
  const [state, setState] = useState<Omit<PortfolioState, "refresh">>({
    loading: true,
    error: null,
    totalUsd: null,
    wallets: {},
    fetchedAt: null,
  });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch("/api/portfolio", { cache: "no-store" });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const json = (await res.json()) as { wallets: WalletPortfolio[]; totalUsd: number | null; fetchedAt: string };
      setState({
        loading: false,
        error: null,
        totalUsd: json.totalUsd,
        fetchedAt: json.fetchedAt,
        wallets: Object.fromEntries(json.wallets.map((w) => [w.address, w])),
      });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e instanceof Error ? e.message : "Failed to load balances" }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, walletKey]);

  return <Ctx.Provider value={{ ...state, refresh: load }}>{children}</Ctx.Provider>;
}

export function usePortfolio() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePortfolio must be used inside PortfolioProvider");
  return v;
}
