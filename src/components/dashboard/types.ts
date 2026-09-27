export type WalletView = { id: string; label: string; address: string; verified: boolean };

export type SubscriptionView = {
  id: string;
  walletId: string;
  merchant: string;
  payee: string;
  chainId: number;
  token: string;
  amount: string;
  cap: string;
  cadence: string;
  status: "active" | "paused" | "revoked";
  nextCharge: string | null;
  lastChargedAt: string | null;
};

export type ApiKeyView = { id: string; name: string; prefix: string; createdAt: string; lastUsedAt: string | null };

export type ChainOption = { id: number; name: string; native: string; tokens: Record<"USDC" | "USDT", string> };
