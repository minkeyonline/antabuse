// Demo data for the dashboard. Replace with calls to the Antabuse API.

export type Wallet = {
  id: string;
  label: string;
  address: string;
  chain: "Ethereum" | "Base" | "Arbitrum" | "Solana" | "Polygon";
  balanceUsd: number;
  risk: "low" | "medium" | "high";
};

export type SubscriptionStatus = "active" | "paused" | "revoked";

export type Subscription = {
  id: string;
  merchant: string;
  amount: number;
  asset: "USDC" | "USDT" | "ETH";
  cadence: "weekly" | "monthly" | "yearly";
  cap: number;
  nextCharge: string;
  walletId: string;
  status: SubscriptionStatus;
};

export type FirewallEvent = {
  id: string;
  time: string;
  kind: string;
  target: string;
  verdict: "allowed" | "tripped" | "challenged";
  risk: number;
};

export const wallets: Wallet[] = [
  { id: "w1", label: "Main vault", address: "0x71C4…9A3f", chain: "Ethereum", balanceUsd: 48210.42, risk: "low" },
  { id: "w2", label: "Daily spend", address: "0x2bE9…11c0", chain: "Base", balanceUsd: 3120.88, risk: "low" },
  { id: "w3", label: "DeFi farm", address: "0xA93d…e74B", chain: "Arbitrum", balanceUsd: 15890.1, risk: "medium" },
  { id: "w4", label: "Phantom", address: "7xKX…gAsU", chain: "Solana", balanceUsd: 2204.5, risk: "low" },
];

export const subscriptions: Subscription[] = [
  { id: "s1", merchant: "Spotify", amount: 10.99, asset: "USDC", cadence: "monthly", cap: 12, nextCharge: "Oct 3", walletId: "w2", status: "active" },
  { id: "s2", merchant: "Netflix", amount: 15.49, asset: "USDC", cadence: "monthly", cap: 18, nextCharge: "Oct 8", walletId: "w2", status: "active" },
  { id: "s3", merchant: "Alchemy RPC", amount: 49, asset: "USDC", cadence: "monthly", cap: 60, nextCharge: "Oct 11", walletId: "w1", status: "active" },
  { id: "s4", merchant: "Nansen Pro", amount: 1188, asset: "USDT", cadence: "yearly", cap: 1200, nextCharge: "Jan 14", walletId: "w1", status: "paused" },
  { id: "s5", merchant: "Mirror.xyz", amount: 0.002, asset: "ETH", cadence: "weekly", cap: 0.003, nextCharge: "Sep 30", walletId: "w3", status: "active" },
];

export const firewallEvents: FirewallEvent[] = [
  { id: "e1", time: "2m ago", kind: "setApprovalForAll", target: "0x9f3…c21e", verdict: "tripped", risk: 0.97 },
  { id: "e2", time: "11m ago", kind: "Recurring charge", target: "Spotify", verdict: "allowed", risk: 0.02 },
  { id: "e3", time: "34m ago", kind: "Permit2 unlimited", target: "0x44a…07bd", verdict: "tripped", risk: 0.94 },
  { id: "e4", time: "1h ago", kind: "Transfer 2.4 ETH", target: "0xc0f…9912", verdict: "challenged", risk: 0.61 },
  { id: "e5", time: "3h ago", kind: "Recurring charge", target: "Alchemy RPC", verdict: "allowed", risk: 0.04 },
  { id: "e6", time: "5h ago", kind: "increaseAllowance", target: "fake-uniswap.app", verdict: "tripped", risk: 0.99 },
];
