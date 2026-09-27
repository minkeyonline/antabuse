import { createPublicClient, http, type Address, type Chain, type PublicClient } from "viem";
import { arbitrum, base, mainnet, optimism, polygon } from "viem/chains";

export type TokenSymbol = "USDC" | "USDT";

export type SupportedChain = {
  id: number;
  name: string;
  chain: Chain;
  native: { symbol: string; coingeckoId: string };
  tokens: Record<TokenSymbol, Address>;
  rpcEnv: string;
};

// Stablecoin contracts verified on-chain (symbol + 6 decimals).
export const CHAINS: SupportedChain[] = [
  {
    id: 1,
    name: "Ethereum",
    chain: mainnet,
    native: { symbol: "ETH", coingeckoId: "ethereum" },
    tokens: {
      USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    },
    rpcEnv: "RPC_URL_ETHEREUM",
  },
  {
    id: 8453,
    name: "Base",
    chain: base,
    native: { symbol: "ETH", coingeckoId: "ethereum" },
    tokens: {
      USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      USDT: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
    },
    rpcEnv: "RPC_URL_BASE",
  },
  {
    id: 42161,
    name: "Arbitrum",
    chain: arbitrum,
    native: { symbol: "ETH", coingeckoId: "ethereum" },
    tokens: {
      USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    },
    rpcEnv: "RPC_URL_ARBITRUM",
  },
  {
    id: 10,
    name: "Optimism",
    chain: optimism,
    native: { symbol: "ETH", coingeckoId: "ethereum" },
    tokens: {
      USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
      USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    },
    rpcEnv: "RPC_URL_OPTIMISM",
  },
  {
    id: 137,
    name: "Polygon",
    chain: polygon,
    native: { symbol: "POL", coingeckoId: "polygon-ecosystem-token" },
    tokens: {
      USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
      USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    },
    rpcEnv: "RPC_URL_POLYGON",
  },
];

export const TOKEN_DECIMALS = 6;

export function getChain(id: number) {
  return CHAINS.find((c) => c.id === id);
}

export function chainName(id: number) {
  return getChain(id)?.name ?? `Chain ${id}`;
}

const clients = new Map<number, PublicClient>();

export function getClient(id: number): PublicClient | undefined {
  const c = getChain(id);
  if (!c) return undefined;
  let client = clients.get(id);
  if (!client) {
    client = createPublicClient({
      chain: c.chain,
      transport: http(process.env[c.rpcEnv] || undefined, { timeout: 8_000, retryCount: 1 }),
      batch: { multicall: true },
    }) as PublicClient;
    clients.set(id, client);
  }
  return client;
}

/** Which token a contract address represents on a chain, if it is a supported stablecoin. */
export function tokenSymbolFor(chainId: number, address: string): TokenSymbol | undefined {
  const c = getChain(chainId);
  if (!c) return undefined;
  return (Object.keys(c.tokens) as TokenSymbol[]).find(
    (s) => c.tokens[s].toLowerCase() === address.toLowerCase(),
  );
}
