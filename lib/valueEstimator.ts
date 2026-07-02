// "Estimated value" means two very different things depending on the protocol:
//
//  - Pre-TGE (Scroll, Linea, ...): nobody knows real token supply, allocation %,
//    or your exact share of the points pool. We return a labeled, speculative
//    guess — never presented as fact.
//  - Post-TGE (LayerZero, zkSync, EigenLayer/EigenCloud, Blast): the token
//    trades on the open market. If you've entered a real token amount, value
//    is `amount × live price` from CoinGecko — a real number, not a guess.

import type { Protocol } from "./protocols";
import { getMarketData } from "./marketData";

export type ValueEstimate = {
  usd: number | null;
  confidence: "none" | "low" | "speculative" | "live";
  explanation: string;
};

const DEFAULT_POOL_ASSUMPTION = {
  airdropSupplyPct: 0.08, // 8% of FDV typically allocated to points-based airdrop, historically common but not universal
  assumedTotalPoolPoints: 10_000_000, // placeholder — replace per-protocol if you find a real published pool size
};

export async function estimateWalletValue(protocol: Protocol, points: number | null): Promise<ValueEstimate> {
  if (points === null) {
    return { usd: null, confidence: "none", explanation: "No points/tokens on record for this protocol yet." };
  }

  // Post-TGE: points field holds a real token amount, priced live.
  if (protocol.liveToken) {
    const market = await getMarketData(protocol.liveToken.coingeckoId);
    if (!market) {
      return {
        usd: null,
        confidence: "none",
        explanation: `Couldn't reach CoinGecko for live ${protocol.liveToken.symbol} price right now — try again shortly.`,
      };
    }
    const usd = Math.round(points * market.priceUsd);
    return {
      usd,
      confidence: "live",
      explanation: `${points.toLocaleString()} ${protocol.liveToken.symbol} × live price $${market.priceUsd.toFixed(4)} (CoinGecko, fetched ${new Date(market.fetchedAt).toLocaleTimeString()}). This is real market value, not a guess.`,
    };
  }

  // Pre-TGE: speculative points-pool-share estimate.
  if (protocol.fdv.estimateUsd === null) {
    return {
      usd: null,
      confidence: "none",
      explanation: `No defensible FDV figure available for ${protocol.name} (${protocol.fdv.sourceNote})`,
    };
  }

  const airdropPoolUsd = protocol.fdv.estimateUsd * DEFAULT_POOL_ASSUMPTION.airdropSupplyPct;
  const yourShare = points / DEFAULT_POOL_ASSUMPTION.assumedTotalPoolPoints;
  const usd = Math.round(airdropPoolUsd * yourShare);

  return {
    usd,
    confidence: "speculative",
    explanation:
      `Assumes ${(DEFAULT_POOL_ASSUMPTION.airdropSupplyPct * 100).toFixed(0)}% of a $${(protocol.fdv.estimateUsd / 1e9).toFixed(2)}B FDV goes to the points airdrop, ` +
      `split across an assumed ${DEFAULT_POOL_ASSUMPTION.assumedTotalPoolPoints.toLocaleString()} total pool points. Real allocation % and pool size are unknown until TGE — treat this as a rough order of magnitude, not a forecast.`,
  };
}
