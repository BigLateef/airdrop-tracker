import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getProtocol } from "@/lib/protocols";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const address = typeof body?.address === "string" ? body.address.toLowerCase() : null;
  const protocolSlug = typeof body?.protocolSlug === "string" ? body.protocolSlug : null;
  const points = typeof body?.points === "number" ? body.points : Number(body?.points);
  const note = typeof body?.note === "string" ? body.note : null;

  if (!address || !protocolSlug || Number.isNaN(points)) {
    return NextResponse.json({ error: "Provide `address`, `protocolSlug`, and numeric `points`." }, { status: 400 });
  }
  if (!getProtocol(protocolSlug)) {
    return NextResponse.json({ error: `Unknown protocol "${protocolSlug}".` }, { status: 400 });
  }

  const [wallet] = await sql`select id from wallets where address = ${address}`;
  if (!wallet) return NextResponse.json({ error: "Wallet not tracked yet — add it first." }, { status: 404 });

  await sql`
    insert into manual_points (wallet_id, protocol_slug, points, note, updated_at)
    values (${wallet.id}, ${protocolSlug}, ${points}, ${note}, now())
    on conflict (wallet_id, protocol_slug) do update set
      points = excluded.points, note = excluded.note, updated_at = now()
  `;

  // Also drop a snapshot row so trend history includes manual updates.
  await sql`
    insert into point_snapshots (wallet_id, protocol_slug, points, source)
    values (${wallet.id}, ${protocolSlug}, ${points}, 'manual')
  `;

  return NextResponse.json({ ok: true });
}
