// Real on-chain activity lookups via Etherscan's unified multichain API (V2).
// One API key, `chainid` param selects the network. Get a free key at
// https://etherscan.io/apis — set it as ETHERSCAN_API_KEY.
//
// If Etherscan V2 ever changes shape for a given chain, this is the one
// place to fix it. Falls back gracefully (returns empty activity) on error
// rather than throwing, so one bad chain doesn't kill the whole crawl.

const ETHERSCAN_V2_BASE = "https://api.etherscan.io/v2/api";

export type WalletActivity = {
  chainId: number;
  address: string;
  txCount: number;
  firstTx: Date | null;
  lastTx: Date | null;
  touchedContracts: Set<string>;
};

export async function getWalletActivity(chainId: number, address: string): Promise<WalletActivity> {
  const key = process.env.ETHERSCAN_API_KEY;
  const empty: WalletActivity = { chainId, address, txCount: 0, firstTx: null, lastTx: null, touchedContracts: new Set() };
  if (!key) {
    console.warn("ETHERSCAN_API_KEY not set — skipping on-chain lookups.");
    return empty;
  }

  const url = `${ETHERSCAN_V2_BASE}?chainid=${chainId}&module=account&action=txlist&address=${address}&sort=asc&apikey=${key}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return empty;
    const data = await res.json();
    if (data.status !== "1" || !Array.isArray(data.result)) return empty;

    const txs = data.result as Array<{ timeStamp: string; to: string }>;
    if (txs.length === 0) return empty;

    const touched = new Set<string>();
    for (const tx of txs) {
      if (tx.to) touched.add(tx.to.toLowerCase());
    }

    return {
      chainId,
      address,
      txCount: txs.length,
      firstTx: new Date(Number(txs[0].timeStamp) * 1000),
      lastTx: new Date(Number(txs[txs.length - 1].timeStamp) * 1000),
      touchedContracts: touched,
    };
  } catch (err) {
    console.error(`getWalletActivity failed for chain ${chainId}, address ${address}:`, err);
    return empty;
  }
}

// Finds the address that sent this wallet its first-ever incoming value —
// i.e. who "funded" it. Used for sybil clustering: wallets funded from the
// same source are very likely controlled by the same person.
export async function getFundingSource(chainId: number, address: string): Promise<string | null> {
  const key = process.env.ETHERSCAN_API_KEY;
  if (!key) return null;

  const url = `${ETHERSCAN_V2_BASE}?chainid=${chainId}&module=account&action=txlist&address=${address}&sort=asc&apikey=${key}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== "1" || !Array.isArray(data.result)) return null;

    const incoming = (data.result as Array<{ to: string; from: string; value: string }>).find(
      (tx) => tx.to?.toLowerCase() === address.toLowerCase() && Number(tx.value) > 0
    );
    return incoming ? incoming.from.toLowerCase() : null;
  } catch {
    return null;
  }
}

export function walletAgeDays(firstTx: Date | null): number | null {
  if (!firstTx) return null;
  return Math.floor((Date.now() - firstTx.getTime()) / (1000 * 60 * 60 * 24));
}
