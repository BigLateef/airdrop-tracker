import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { PROTOCOLS } from "@/lib/protocols";
import { getWalletActivity } from "@/lib/chain";

export const dynamic = "force-dynamic";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const addresses: string[] = Array.isArray(body?.addresses)
    ? body.addresses
    : typeof body?.address === "string"
      ? [body.address]
      : [];
  const label: string | null = typeof body?.label === "string" ? body.label : null;

  if (addresses.length === 0) {
    return NextResponse.json({ error: "Provide `address` or `addresses: string[]`." }, { status: 400 });
  }
  for (const addr of addresses) {
    if (!ADDRESS_RE.test(addr)) {
      return NextResponse.json({ error: `"${addr}" is not a valid EVM address.` }, { status: 400 });
    }
  }

  const results = [];

  for (const rawAddress of addresses) {
    const address = rawAddress.toLowerCase();

    const [wallet] = await sql`
      insert into wallets (address, label)
      values (${address}, ${label})
      on conflict (address) do update set label = coalesce(excluded.label, wallets.label)
      returning id, address, label
    `;

    const detected: Array<{ protocol: string; txCount: number; firstInteraction: string | null; lastInteraction: string | null }> = [];

    // Check every protocol's eligibility contracts. Grouped by chainId so we
    // don't refetch the same chain's tx list twice for one wallet.
    const chainIds = [...new Set(PROTOCOLS.map((p) => p.chainId))];
    const activityByChain = new Map<number, Awaited<ReturnType<typeof getWalletActivity>>>();
    for (const chainId of chainIds) {
      activityByChain.set(chainId, await getWalletActivity(chainId, address));
    }

    for (const protocol of PROTOCOLS) {
      const activity = activityByChain.get(protocol.chainId)!;
      const contractAddrs = protocol.contracts.map((c) => c.address.toLowerCase());
      const touchedAny = contractAddrs.some((a) => activity.touchedContracts.has(a));
      // Fallback: any activity at all on the protocol's native chain also
      // counts as a weak eligibility signal (e.g. Blast/Scroll/Linea usage
      // beyond just the bridge tx).
      const hasChainActivity = activity.txCount > 0;

      if (touchedAny || hasChainActivity) {
        await sql`
          insert into wallet_protocols (wallet_id, protocol_slug, first_interaction, last_interaction, tx_count)
          values (${wallet.id}, ${protocol.slug}, ${activity.firstTx}, ${activity.lastTx}, ${activity.txCount})
          on conflict (wallet_id, protocol_slug) do update set
            last_interaction = excluded.last_interaction,
            tx_count = excluded.tx_count
        `;
        detected.push({
          protocol: protocol.slug,
          txCount: activity.txCount,
          firstInteraction: activity.firstTx?.toISOString() ?? null,
          lastInteraction: activity.lastTx?.toISOString() ?? null,
        });
      }
    }

    results.push({ wallet, detectedProtocols: detected });
  }

  return NextResponse.json({ results });
}
