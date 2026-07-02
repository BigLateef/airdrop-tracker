// Live price/FDV for tokens that have already launched and trade on the open
// market. No API key needed for CoinGecko's free tier at this call volume —
// if you outgrow the free rate limit, add COINGECKO_API_KEY and switch to
// the pro base URL / `x-cg-pro-api-key` header.
//
// Verified CoinGecko coin IDs (checked live, not guessed):
//   LayerZero (ZRO)      -> "layerzero"
//   ZKsync (ZK)          -> "zksync"
//   EigenCloud/EIGEN     -> "eigencloud"  (EigenLayer rebranded to EigenCloud)
//   Blast (BLAST)        -> "blast"

const CG_BASE = "https://api.coingecko.com/api/v3";

export type MarketData = {
  priceUsd: number;
  marketCapUsd: number | null;
  fdvUsd: number | null;
  fetchedAt: string;
};

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min — plenty fresh for a farming dashboard, kind to the free rate limit
const cache = new Map<string, { data: MarketData; expires: number }>();

export async function getMarketData(coingeckoId: string): Promise<MarketData | null> {
  const cached = cache.get(coingeckoId);
  if (cached && cached.expires > Date.now()) return cached.data;

  try {
    const res = await fetch(
      `${CG_BASE}/coins/markets?vs_currency=usd&ids=${encodeURIComponent(coingeckoId)}`,
      { cache: "no-store" }
    );
    if (!res.ok) {
      console.error(`CoinGecko request failed for ${coingeckoId}: ${res.status}`);
      return null;
    }
    const rows = await res.json();
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) return null;

    const data: MarketData = {
      priceUsd: row.current_price,
      marketCapUsd: row.market_cap ?? null,
      fdvUsd: row.fully_diluted_valuation ?? null,
      fetchedAt: new Date().toISOString(),
    };
    cache.set(coingeckoId, { data, expires: Date.now() + CACHE_TTL_MS });
    return data;
  } catch (err) {
    console.error(`getMarketData failed for ${coingeckoId}:`, err);
    return null;
  }
}
