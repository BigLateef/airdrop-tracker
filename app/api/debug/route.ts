import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

// TEMPORARY diagnostic route — delete this file once the mystery is solved.
// Reveals (safely, no password) which Neon host/db the live server is
// actually talking to, and how many rows it sees in `wallets` right now.
export async function GET() {
  const raw = process.env.DATABASE_URL ?? "(not set)";
  let hostInfo = "(could not parse)";
  try {
    const u = new URL(raw);
    hostInfo = `host=${u.hostname} db=${u.pathname.replace("/", "")}`;
  } catch {
    // leave default
  }

  let rowCount: number | string = "(query failed)";
  let rows: any[] = [];
  try {
    const result = await sql`select count(*)::int as count from wallets`;
    rowCount = result[0]?.count ?? "(unknown)";
    rows = await sql`select id, address, created_at from wallets order by created_at desc limit 5`;
  } catch (err: any) {
    rowCount = `error: ${err.message}`;
  }

  return NextResponse.json({
    vercelEnv: process.env.VERCEL_ENV ?? "(not set)",
    databaseUrlSet: raw !== "(not set)",
    connectionInfo: hostInfo,
    walletRowCount: rowCount,
    recentWallets: rows,
  });
}