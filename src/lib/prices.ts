import "server-only";

const IDS = ["ethereum", "polygon-ecosystem-token", "usd-coin", "tether"] as const;
export type PriceMap = Partial<Record<(typeof IDS)[number], number>>;

let cache: { at: number; prices: PriceMap } | undefined;

/** Spot USD prices from CoinGecko, cached for 60s. Returns {} if the API is unreachable. */
export async function getUsdPrices(): Promise<PriceMap> {
  if (cache && Date.now() - cache.at < 60_000) return cache.prices;
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${IDS.join(",")}&vs_currencies=usd`,
      { signal: AbortSignal.timeout(6_000), headers: { accept: "application/json" } },
    );
    if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
    const json = (await res.json()) as Record<string, { usd?: number }>;
    const prices: PriceMap = {};
    for (const id of IDS) if (json[id]?.usd != null) prices[id] = json[id].usd;
    cache = { at: Date.now(), prices };
    return prices;
  } catch {
    return cache?.prices ?? {};
  }
}
