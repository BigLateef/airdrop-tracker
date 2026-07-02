# Airdrop Tracker

One dashboard for points, tasks, and sybil risk across LayerZero, zkSync, EigenLayer,
Scroll, Linea, and Blast — built from real on-chain data, with manual entry for
protocols that don't publish a public points API (which is most of them, today).

## What's real vs. what you enter yourself

- **Protocol eligibility, tx counts, interaction dates, sybil risk score** — all
  computed live from on-chain data via Etherscan's multichain API. Real, automatic.
- **Points/XP totals** — most points programs (Scroll Marks, Linea LXP, EigenLayer
  points, etc.) are computed in a private backend and have no stable public API.
  For those, you enter the number yourself in the dashboard (click the points cell)
  and it's stored with full history. If you find/build a real API adapter for one,
  wire it into `lib/protocols.ts` (`pointsSource: { type: "api", fetch: ... }`) and
  the crawler will pull it automatically from then on.
- **Estimated value (USD)** — two modes, and the dashboard tags which one you're
  looking at:
  - **`(live)`** — LayerZero (ZRO), zkSync (ZK), EigenLayer/EigenCloud (EIGEN),
    and Blast (BLAST) have all already launched tokens. For these, the "points"
    field is really a **token amount** (your confirmed claim), and value is
    `amount × live price` pulled from CoinGecko's public API in real time.
    No API key needed at this volume — see `lib/marketData.ts`.
  - **`(guess)`** — Scroll and Linea haven't launched tokens yet. Value here is
    points × a rough, editable FDV assumption in `lib/valueEstimator.ts`.
    Treat it as order-of-magnitude, not a forecast — nobody knows real airdrop
    allocation % until TGE.
- **Tasks** — click the count badge (e.g. "0/3 ▼") on any protocol row to expand
  a per-protocol checklist. Add/check off/delete tasks freely; they're just
  reminders you maintain, not auto-detected.

## 1. Set up Neon

1. Create a project at [neon.tech](https://neon.tech) (free tier is enough).
2. Copy the connection string into `.env.local` (copy `.env.example` first).
3. Apply the schema:
   ```bash
   npm install
   node db/init.mjs
   ```

## 2. Get an Etherscan API key

Free tier at [etherscan.io/apis](https://etherscan.io/apis). This powers the
multichain V2 API used for on-chain lookups across all six chains from one key.
Add it as `ETHERSCAN_API_KEY`.

## 3. Set up the Discord webhook

Server Settings → Integrations → Webhooks → New Webhook → Copy Webhook URL.
Add it as `DISCORD_WEBHOOK_URL`. This is where the daily point update posts.

## 4. Deploy to Vercel

```bash
npm install
npx vercel deploy
```

Set the four environment variables (`DATABASE_URL`, `ETHERSCAN_API_KEY`,
`DISCORD_WEBHOOK_URL`, `CRON_SECRET`) in the Vercel project settings — generate
`CRON_SECRET` yourself, e.g. `openssl rand -hex 32`.

## 5. Set up the cron job on cron-job.org

1. Create a free account at [cron-job.org](https://cron-job.org).
2. New cron job → URL:
   ```
   https://YOUR-APP.vercel.app/api/crawler/run?secret=YOUR_CRON_SECRET
   ```
3. Schedule: once daily (or more often if you want tighter tracking — mind
   Etherscan free-tier rate limits at ~5 req/s).
4. Save. Each run refreshes on-chain activity, updates sybil scores, and posts
   the Discord daily update.

## Before you trust eligibility detection: verify the contracts

`lib/protocols.ts` marks each protocol's on-chain contracts `verified: true` only
if this was confirmed against a live source during the build. Several are marked
`verified: false` with a `sourceUrl` pointing to the protocol's own docs — check
and update those addresses before relying on eligibility detection for that
protocol. Wrong address = wrong eligibility signal.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in your values
npm run dev
```

Trigger a crawl manually while developing:
```bash
curl "http://localhost:3000/api/crawler/run?secret=YOUR_CRON_SECRET"
```

## Extending it

- **New protocol**: add an entry to `PROTOCOLS` in `lib/protocols.ts`.
- **Real points API found**: change that protocol's `pointsSource` to
  `{ type: "api", notes, fetch: async (address) => ... }`.
- **Task checklist**: the `tasks` table exists in the schema but isn't wired
  into the UI yet — it's a natural next feature (see suggestions below).

## Known limitations (be aware, not surprised)

- Etherscan's `txlist` endpoint returns up to 10,000 rows per call without
  pagination handled here — very high-activity wallets may show truncated
  history. Add pagination in `lib/chain.ts` if that matters to you.
- Sybil scoring only checks mainnet funding-source clustering. It's a smell
  test, not a verdict — extend `lib/sybil.ts` with more signals as you find them.
- FDV estimates are static config values, not live data. Revisit them regularly.
