import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const id = Number(body?.id);
  if (!id) return NextResponse.json({ error: "Provide numeric `id`." }, { status: 400 });

  await sql`delete from tasks where id = ${id}`;
  return NextResponse.json({ deleted: id });
}
