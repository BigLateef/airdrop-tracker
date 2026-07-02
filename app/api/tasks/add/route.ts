import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getProtocol } from "@/lib/protocols";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const address = typeof body?.address === "string" ? body.address.toLowerCase() : null;
  const protocolSlug = typeof body?.protocolSlug === "string" ? body.protocolSlug : null;
  const title = typeof body?.title === "string" ? body.title.trim() : "";

  if (!address || !protocolSlug || !title) {
    return NextResponse.json({ error: "Provide `address`, `protocolSlug`, and `title`." }, { status: 400 });
  }
  if (!getProtocol(protocolSlug)) {
    return NextResponse.json({ error: `Unknown protocol "${protocolSlug}".` }, { status: 400 });
  }

  const [wallet] = await sql`select id from wallets where address = ${address}`;
  if (!wallet) return NextResponse.json({ error: "Wallet not tracked yet — add it first." }, { status: 404 });

  const [task] = await sql`
    insert into tasks (wallet_id, protocol_slug, title)
    values (${wallet.id}, ${protocolSlug}, ${title})
    returning id, title, done
  `;

  return NextResponse.json({ task });
}
