import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const address = typeof body?.address === "string" ? body.address.toLowerCase() : null;
  if (!address) return NextResponse.json({ error: "Provide `address`." }, { status: 400 });

  await sql`delete from wallets where address = ${address}`;
  return NextResponse.json({ removed: address });
}
