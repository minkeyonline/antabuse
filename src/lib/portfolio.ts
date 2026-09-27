import "server-only";
import { erc20Abi, formatUnits, type Address } from "viem";
import { CHAINS, TOKEN_DECIMALS, getClient, type TokenSymbol } from "./chains";
import { getUsdPrices } from "./prices";

export type Holding = { chainId: number; chain: string; symbol: string; amount: number; usd: number | null };

export type WalletPortfolio = {
  address: string;
  holdings: Holding[];
  totalUsd: number | null;
  errors: string[];
};

const PRICE_ID: Record<string, "ethereum" | "polygon-ecosystem-token" | "usd-coin" | "tether"> = {
  ETH: "ethereum",
  POL: "polygon-ecosystem-token",
  USDC: "usd-coin",
  USDT: "tether",
};

export async function getPortfolio(address: Address): Promise<WalletPortfolio> {
  const prices = await getUsdPrices();
  const errors: string[] = [];

  const perChain = await Promise.all(
    CHAINS.map(async (c) => {
      const client = getClient(c.id)!;
      try {
        const symbols = Object.keys(c.tokens) as TokenSymbol[];
        const [native, ...tokens] = await Promise.all([
          client.getBalance({ address }),
          ...symbols.map((s) =>
            client.readContract({ address: c.tokens[s], abi: erc20Abi, functionName: "balanceOf", args: [address] }),
          ),
        ]);
        const rows: Holding[] = [
          { chainId: c.id, chain: c.name, symbol: c.native.symbol, amount: Number(formatUnits(native, 18)), usd: null },
          ...symbols.map((s, i) => ({
            chainId: c.id,
            chain: c.name,
            symbol: s,
            amount: Number(formatUnits(tokens[i], TOKEN_DECIMALS)),
            usd: null,
          })),
        ];
        return rows;
      } catch {
        errors.push(c.name);
        return [];
      }
    }),
  );

  const holdings = perChain
    .flat()
    .filter((h) => h.amount > 0)
    .map((h) => {
      const price = prices[PRICE_ID[h.symbol]];
      return { ...h, usd: price != null ? h.amount * price : null };
    });

  const priced = holdings.every((h) => h.usd != null);
  const totalUsd = priced ? holdings.reduce((s, h) => s + (h.usd ?? 0), 0) : null;
  return { address, holdings, totalUsd, errors };
}
