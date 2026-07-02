import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { PROTOCOLS, getProtocol } from "@/lib/protocols";
import { estimateWalletValue } from "@/lib/valueEstimator";

// Without this, Next.js tries to statically pre-render this route at BUILD
// time (before any real DB/env is guaranteed available), which breaks the
// build the moment this route touches the database. Every route that reads
// or writes the DB needs this.
export const dynamic = "force-dynamic";

export async function GET() {
  const wallets = await sql`select id, address, label from wallets order by created_at asc`;

  const out = [];
  for (const wallet of wallets) {
    const walletProtocols = await sql`
      select protocol_slug, first_interaction, last_interaction, tx_count
      from wallet_protocols where wallet_id = ${wallet.id}
    `;

    const sybil = await sql`select score, reasons, computed_at from sybil_scores where wallet_id = ${wallet.id}`;

    const rows = [];
    for (const wp of walletProtocols) {
      const protocol = getProtocol(wp.protocol_slug);
      if (!protocol) continue;

      const [latestSnapshot] = await sql`
        select points, source, captured_at from point_snapshots
        where wallet_id = ${wallet.id} and protocol_slug = ${wp.protocol_slug}
        order by captured_at desc limit 1
      `;
      const [manual] = await sql`
        select points, note, updated_at from manual_points
        where wallet_id = ${wallet.id} and protocol_slug = ${wp.protocol_slug}
      `;

      const currentPoints = manual?.points ?? latestSnapshot?.points ?? null;
      const pointsSource = manual ? "manual" : (latestSnapshot?.source ?? "unavailable");
      const value = await estimateWalletValue(protocol, currentPoints !== null ? Number(currentPoints) : null);

      const tasks = await sql`
        select id, title, done from tasks
        where wallet_id = ${wallet.id} and protocol_slug = ${wp.protocol_slug}
        order by created_at asc
      `;

      rows.push({
        protocolSlug: protocol.slug,
        protocolName: protocol.name,
        points: currentPoints !== null ? Number(currentPoints) : null,
        pointsSource,
        estimatedValueUsd: value.usd,
        valueConfidence: value.confidence,
        valueExplanation: value.explanation,
        firstInteraction: wp.first_interaction,
        lastInteraction: wp.last_interaction,
        txCount: wp.tx_count,
        pointsSourceType: protocol.pointsSource.type,
        pointsSourceNotes: protocol.pointsSource.notes,
        liveTokenSymbol: protocol.liveToken?.symbol ?? null,
        tasks: tasks.map((t) => ({ id: t.id, title: t.title, done: t.done })),
      });
    }

    out.push({
      id: wallet.id,
      address: wallet.address,
      label: wallet.label,
      protocols: rows,
      sybil: sybil[0] ?? null,
    });
  }

  return NextResponse.json({
    wallets: out,
    knownProtocols: PROTOCOLS.map((p) => ({ slug: p.slug, name: p.name })),
  });
}
