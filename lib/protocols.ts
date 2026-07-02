// Protocol registry — this is the pluggable adapter system.
//
// Every protocol has two independent things:
//  1. Eligibility detection: on-chain contracts we check wallet history against.
//     This is always real, computed from public RPC/explorer data.
//  2. Points source: either a live API adapter (if one exists and is stable
//     enough to wire in) or "manual" (you enter/update the number yourself,
//     because the protocol has no public points API).
//
// IMPORTANT: contract addresses marked verified:false were NOT confirmed
// against a live source in this session. Do not trust them blindly — check
// the sourceUrl and update before relying on eligibility detection for that
// protocol. This file is meant to be edited; treat it as config, not gospel.

export type ChainContract = {
  address: string;
  label: string;
  verified: boolean;
  sourceUrl: string;
};

export type Protocol = {
  slug: string;
  name: string;
  chainId: number; // chain to scan for eligibility (etherscan-v2 "chainid" param)
  contracts: ChainContract[];
  pointsSource:
    | { type: "manual"; notes: string }
    | { type: "api"; notes: string; fetch: (address: string) => Promise<number | null> };
  fdv: {
    estimateUsd: number | null; // speculative, pre-TGE guess — null if no reasonable public figure exists
    asOf: string;
    sourceNote: string;
  };
  // For protocols whose token has already launched, value should come from a
  // live market feed, not a static FDV guess. When set, the "points" field
  // for this protocol is interpreted as a known TOKEN AMOUNT (e.g. your
  // confirmed airdrop claim), not an abstract points score.
  liveToken?: {
    coingeckoId: string; // verified against a live CoinGecko page before being added here
    symbol: string;
  };
};

// --- Points source: manual placeholder used by every protocol until you wire
// a real API in. Swap this out per-protocol in the `pointsSource` field below
// as soon as you find/verify an endpoint worth trusting.
const manual = (notes: string) => ({ type: "manual" as const, notes });

export const PROTOCOLS: Protocol[] = [
  {
    slug: "layerzero",
    name: "LayerZero",
    chainId: 1,
    contracts: [
      {
        address: "0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675",
        label: "Endpoint V1 (Ethereum)",
        verified: true,
        sourceUrl: "https://docs.layerzero.network/v1/developers/evm/technical-reference/mainnet/mainnet-addresses",
      },
    ],
    pointsSource: manual(
      "LayerZero has not shipped a public points/XP API. ZRO airdrop (2024) used a one-time snapshot + Merkle claim, not an ongoing points balance. Enter the amount of ZRO you actually received/claimed — value is priced live below."
    ),
    fdv: { estimateUsd: null, asOf: "2026-07-01", sourceNote: "ZRO is live — value comes from CoinGecko's live price/FDV, not this static field." },
    liveToken: { coingeckoId: "layerzero", symbol: "ZRO" },
  },
  {
    slug: "zksync",
    name: "zkSync Era",
    chainId: 324,
    contracts: [
      {
        address: "0x32400084C286CF3E17e7B677ea9583e60a000324",
        label: "L1 Bridge / Diamond Proxy (unverified this session)",
        verified: false,
        sourceUrl: "https://docs.zksync.io/build/support/contracts",
      },
    ],
    pointsSource: manual(
      "ZK token airdrop already happened via snapshot/Merkle claim; there's no live 'points' balance API. Enter the amount of ZK you actually received/claimed — value is priced live below."
    ),
    fdv: { estimateUsd: null, asOf: "2026-07-01", sourceNote: "ZK is live — value comes from CoinGecko's live price/FDV, not this static field." },
    liveToken: { coingeckoId: "zksync", symbol: "ZK" },
  },
  {
    slug: "eigenlayer",
    name: "EigenLayer",
    chainId: 1,
    contracts: [
      {
        address: "0x858646372CC42E1A627fcE94aa7A7033e7CF075A",
        label: "StrategyManager (unverified this session)",
        verified: false,
        sourceUrl: "https://docs.eigenlayer.xyz/eigenlayer/contracts/eigenlayer-contract-deployments",
      },
    ],
    pointsSource: manual(
      "EigenPoints are computed server-side in the EigenLayer/EigenCloud app and are not exposed via a stable public REST endpoint. Enter your confirmed EIGEN token amount if you've claimed, or your points-app total otherwise — value pricing only applies once it's a real token amount."
    ),
    fdv: { estimateUsd: null, asOf: "2026-07-01", sourceNote: "EIGEN is live (project rebranded EigenLayer → EigenCloud) — value comes from CoinGecko's live price/FDV, not this static field." },
    liveToken: { coingeckoId: "eigencloud", symbol: "EIGEN" },
  },
  {
    slug: "scroll",
    name: "Scroll",
    chainId: 534352,
    contracts: [
      {
        address: "0xF8B1378579659D8F7EE5f3C929c2f3E332E41Fd6",
        label: "L1 Gateway Router (confirmed via docs.scroll.io this session)",
        verified: true,
        sourceUrl: "https://docs.scroll.io/en/developers/scroll-contracts/",
      },
    ],
    pointsSource: manual(
      "Scroll 'Marks' totals are shown in the Scroll app UI and are not published as a documented public JSON API. Enter your Marks manually until/unless Scroll ships one."
    ),
    fdv: { estimateUsd: 1_800_000_000, asOf: "2026-07-01", sourceNote: "Rough, widely-cited pre-TGE valuation chatter from Scroll's last raise — treat as a loose guess, not a fact. Update or remove this number as better info surfaces." },
  },
  {
    slug: "linea",
    name: "Linea",
    chainId: 59144,
    contracts: [
      {
        address: "0xd19d4B5d358258f05D7B411E21A1460D11B0876F",
        label: "Canonical Bridge (unverified this session)",
        verified: false,
        sourceUrl: "https://docs.linea.build/get-started/how-to/bridge",
      },
    ],
    pointsSource: manual(
      "LXP / LXP-L (LayerZero-style loyalty points) are queryable via the Linea Voyage app but have no stable documented public API. Enter your LXP manually."
    ),
    fdv: { estimateUsd: null, asOf: "2026-07-01", sourceNote: "No reliable public FDV figure for an unlaunched LINEA token as of this writing — leave blank rather than guess." },
  },
  {
    slug: "blast",
    name: "Blast",
    chainId: 81457,
    contracts: [
      {
        address: "0x5F6AE08B8AeB7078cf2F96AFb089D7c9f51DA47d",
        label: "Canonical Bridge (unverified this session)",
        verified: false,
        sourceUrl: "https://docs.blast.io",
      },
    ],
    pointsSource: manual(
      "Blast's official Points API was retired (confirmed via docs.blast.io). BLAST has already launched and airdropped — there's no live points balance to poll anymore. Enter the amount of BLAST you actually received/claimed — value is priced live below."
    ),
    fdv: { estimateUsd: null, asOf: "2026-07-01", sourceNote: "BLAST is live — value comes from CoinGecko's live price/FDV, not this static field." },
    liveToken: { coingeckoId: "blast", symbol: "BLAST" },
  },
];

export function getProtocol(slug: string): Protocol | undefined {
  return PROTOCOLS.find((p) => p.slug === slug);
}
