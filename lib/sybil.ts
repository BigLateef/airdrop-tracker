// Sybil risk flag — heuristic, computed entirely from real on-chain data
// already pulled during the crawl. This is a smell test for the wallet's
// OWNER to self-audit before a protocol's own sybil filter does, not a
// claim about what any protocol will actually decide.
//
// None of this is exact science — it's the same handful of signals
// experienced farmers eyeball manually, made visible at a glance.

import type { WalletActivity } from "./chain";

export type SybilInput = {
  address: string;
  activityByChain: WalletActivity[];
  // First-seen timestamp of the wallet on Ethereum mainnet, if known.
  walletAgeDays: number | null;
  // How many OTHER tracked wallets in this account funded this wallet's
  // very first transaction from the same source address.
  sharedFunderCount: number;
};

export type SybilResult = {
  score: number; // 0 (low risk) .. 100 (high risk)
  reasons: string[];
};

export function computeSybilScore(input: SybilInput): SybilResult {
  let score = 0;
  const reasons: string[] = [];

  const totalTx = input.activityByChain.reduce((sum, a) => sum + a.txCount, 0);
  const activeChains = input.activityByChain.filter((a) => a.txCount > 0).length;

  if (totalTx <= 3) {
    score += 25;
    reasons.push(`Very low total activity (${totalTx} txs across tracked chains) — reads as a fresh farming wallet.`);
  }

  if (input.walletAgeDays !== null && input.walletAgeDays < 30) {
    score += 20;
    reasons.push(`Wallet is under 30 days old (${input.walletAgeDays}d) — new wallets are weighted heavily by most sybil filters.`);
  }

  if (activeChains <= 1 && input.activityByChain.length > 1) {
    score += 15;
    reasons.push("Only active on a single chain despite being tracked across several — narrow footprint looks farm-like.");
  }

  if (input.sharedFunderCount > 0) {
    score += Math.min(30, input.sharedFunderCount * 10);
    reasons.push(`Funded from the same source as ${input.sharedFunderCount} other wallet(s) in your tracked set — clustering is the single strongest sybil signal.`);
  }

  if (totalTx > 50 && activeChains >= 3) {
    score -= 15;
    reasons.push("Broad, sustained activity across multiple chains — reads more organic.");
  }

  score = Math.max(0, Math.min(100, score));
  if (reasons.length === 0) reasons.push("No notable risk signals found in tracked on-chain activity.");

  return { score, reasons };
}
