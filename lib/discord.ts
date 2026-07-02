// Sends the "Daily Point Update" to a Discord channel via an incoming webhook.
// Create one in Discord: Server Settings → Integrations → Webhooks → New Webhook
// → copy the URL → set as DISCORD_WEBHOOK_URL.

export type DailyUpdateRow = {
  walletLabel: string;
  protocolName: string;
  points: number | null;
  pointsDelta: number | null; // vs previous snapshot, if available
  source: string;
};

export async function sendDailyDiscordUpdate(rows: DailyUpdateRow[]) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("DISCORD_WEBHOOK_URL not set — skipping Discord notification.");
    return { sent: false, reason: "no webhook configured" };
  }
  if (rows.length === 0) {
    return { sent: false, reason: "nothing to report" };
  }

  const lines = rows.map((r) => {
    const pts = r.points === null ? "—" : r.points.toLocaleString();
    const delta =
      r.pointsDelta === null || r.pointsDelta === 0
        ? ""
        : r.pointsDelta > 0
          ? ` (+${r.pointsDelta.toLocaleString()})`
          : ` (${r.pointsDelta.toLocaleString()})`;
    return `**${r.walletLabel}** · ${r.protocolName}: ${pts}${delta}`;
  });

  const embed = {
    title: "📊 Daily Point Update",
    description: lines.join("\n"),
    color: 0x5865f2,
    timestamp: new Date().toISOString(),
    footer: { text: "Airdrop Tracker" },
  };

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ embeds: [embed] }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("Discord webhook failed:", res.status, body);
    return { sent: false, reason: `Discord returned ${res.status}` };
  }

  return { sent: true };
}
