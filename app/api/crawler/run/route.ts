import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { PROTOCOLS, getProtocol } from "@/lib/protocols";
import { getWalletActivity, getFundingSource, walletAgeDays } from "@/lib/chain";
import { computeSybilScore } from "@/lib/sybil";
import { sendDailyDiscordUpdate, type DailyUpdateRow } from "@/lib/discord";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // refuse to run unauthenticated in production
  const fromQuery = req.nextUrl.searchParams.get("secret");
  const fromHeader = req.headers.get("x-cron-secret");
  return fromQuery === secret || fromHeader === secret;
}

// Point up cron-job.org (https://cron-job.org) to hit:
//   GET https://your-app.vercel.app/api/crawler/run?secret=YOUR_CRON_SECRET
// on whatever schedule you want (e.g. daily at 09:00).
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized. Pass ?secret=CRON_SECRET or X-Cron-Secret header." }, { status: 401 });
  }

  const wallets = await sql`select id, address, label from wallets`;
  const dailyRows: DailyUpdateRow[] = [];

  // First pass: refresh on-chain activity per wallet, per chain.
  const chainIds = [...new Set(PROTOCOLS.map((p) => p.chainId))];
  const activityCache = new Map<string, Awaited<ReturnType<typeof getWalletActivity>>>();

  for (const wallet of wallets) {
    for (const chainId of chainIds) {
      const activity = await getWalletActivity(chainId, wallet.address);
      activityCache.set(`${wallet.id}:${chainId}`, activity);
    }

    for (const protocol of PROTOCOLS) {
      const activity = activityCache.get(`${wallet.id}:${protocol.chainId}`)!;
      const contractAddrs = protocol.contracts.map((c) => c.address.toLowerCase());
      const touchedAny = contractAddrs.some((a) => activity.touchedContracts.has(a));
      if (!touchedAny && activity.txCount === 0) continue;

      await sql`
        insert into wallet_protocols (wallet_id, protocol_slug, first_interaction, last_interaction, tx_count)
        values (${wallet.id}, ${protocol.slug}, ${activity.firstTx}, ${activity.lastTx}, ${activity.txCount})
        on conflict (wallet_id, protocol_slug) do update set
          last_interaction = excluded.last_interaction, tx_count = excluded.tx_count
      `;

      // Only protocols with a live API adapter get an automatic snapshot.
      // Everything else stays on manual entry — see lib/protocols.ts.
      if (protocol.pointsSource.type === "api") {
        const [prev] = await sql`
          select points from point_snapshots
          where wallet_id = ${wallet.id} and protocol_slug = ${protocol.slug}
          order by captured_at desc limit 1
        `;
        const points = await protocol.pointsSource.fetch(wallet.address);
        if (points !== null) {
          await sql`
            insert into point_snapshots (wallet_id, protocol_slug, points, source)
            values (${wallet.id}, ${protocol.slug}, ${points}, 'api')
          `;
          dailyRows.push({
            walletLabel: wallet.label ?? wallet.address.slice(0, 8),
            protocolName: protocol.name,
            points,
            pointsDelta: prev ? points - Number(prev.points) : null,
            source: "api",
          });
        }
      }
    }
  }

  // Second pass: sybil scoring, now that all wallets have fresh activity +
  // funding-source data. Needs a second pass so it can compare wallets
  // against each other.
  const fundingSources = new Map<number, string | null>();
  for (const wallet of wallets) {
    fundingSources.set(wallet.id, await getFundingSource(1, wallet.address));
  }

  for (const wallet of wallets) {
    const funder = fundingSources.get(wallet.id);
    const sharedFunderCount = funder
      ? [...fundingSources.entries()].filter(([id, f]) => id !== wallet.id && f === funder).length
      : 0;

    const mainnetActivity = activityCache.get(`${wallet.id}:1`);
    const result = computeSybilScore({
      address: wallet.address,
      activityByChain: chainIds.map((c) => activityCache.get(`${wallet.id}:${c}`)!).filter(Boolean),
      walletAgeDays: walletAgeDays(mainnetActivity?.firstTx ?? null),
      sharedFunderCount,
    });

    await sql`
      insert into sybil_scores (wallet_id, score, reasons, computed_at)
      values (${wallet.id}, ${result.score}, ${JSON.stringify(result.reasons)}, now())
      on conflict (wallet_id) do update set score = excluded.score, reasons = excluded.reasons, computed_at = now()
    `;
  }

  // Include manual-entry protocols in the Discord digest too, so the update
  // reflects the whole dashboard, not just auto-fetched ones.
  for (const wallet of wallets) {
    const manualRows = await sql`
      select protocol_slug, points from manual_points where wallet_id = ${wallet.id}
    `;
    for (const m of manualRows) {
      const protocol = getProtocol(m.protocol_slug);
      if (!protocol) continue;
      dailyRows.push({
        walletLabel: wallet.label ?? wallet.address.slice(0, 8),
        protocolName: protocol.name,
        points: Number(m.points),
        pointsDelta: null,
        source: "manual",
      });
    }
  }

  const discordResult = await sendDailyDiscordUpdate(dailyRows);

  return NextResponse.json({
    walletsProcessed: wallets.length,
    snapshotsTaken: dailyRows.filter((r) => r.source === "api").length,
    discord: discordResult,
  });
}
