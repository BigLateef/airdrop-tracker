"use client";

import { useEffect, useState, useCallback } from "react";
import { AddWalletForm } from "@/components/AddWalletForm";
import { ProtocolTable } from "@/components/ProtocolTable";
import { SybilBadge } from "@/components/SybilBadge";

type WalletData = {
  id: number;
  address: string;
  label: string | null;
  protocols: any[];
  sybil: { score: number; reasons: string[] } | null;
};

export default function Dashboard() {
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/wallets");
    const data = await res.json();
    setWallets(data.wallets ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function removeWallet(address: string) {
    if (!confirm(`Stop tracking ${address}?`)) return;
    await fetch("/api/wallet/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address }),
    });
    load();
  }

  const totalValue = wallets.reduce(
    (sum, w) => sum + w.protocols.reduce((s, p) => s + (p.estimatedValueUsd ?? 0), 0),
    0
  );

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 20px 80px" }}>
      <header style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <h1 className="mono" style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: -0.5 }}>
            airdrop<span style={{ color: "var(--accent)" }}>_</span>tracker
          </h1>
          <span style={{ color: "var(--text-dim)", fontSize: 13 }}>
            {wallets.length} wallet{wallets.length !== 1 ? "s" : ""} tracked
          </span>
        </div>
        <p style={{ color: "var(--text-dim)", fontSize: 14, marginTop: 8, maxWidth: 640 }}>
          Points and estimated value are pulled from real on-chain activity and your own manual entries.
          Values marked <span style={{ color: "var(--accent)" }}>(guess)</span> are speculative pre-TGE
          estimates, not facts — hover any value for the assumptions behind it.
        </p>
      </header>

      <section
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: 20,
          marginBottom: 28,
        }}
      >
        <AddWalletForm onAdded={load} />
      </section>

      {loading && <p style={{ color: "var(--text-dim)" }}>Loading…</p>}

      {!loading && wallets.length === 0 && (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-dim)", border: "1px dashed var(--border)", borderRadius: 10 }}>
          No wallets tracked yet. Add one above — we'll scan its history across every configured protocol.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {wallets.map((w) => (
          <div key={w.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 16px",
                borderBottom: "1px solid var(--border)",
                background: "var(--surface-2)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="mono" style={{ fontWeight: 600 }}>
                  {w.label || w.address.slice(0, 6) + "…" + w.address.slice(-4)}
                </span>
                <span className="mono" style={{ color: "var(--text-dim)", fontSize: 12 }}>
                  {w.address}
                </span>
                {w.sybil && <SybilBadge score={w.sybil.score} reasons={w.sybil.reasons} />}
              </div>
              <button
                onClick={() => removeWallet(w.address)}
                style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-dim)", borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer" }}
              >
                remove
              </button>
            </div>
            <div style={{ padding: "8px 16px 16px" }}>
              <ProtocolTable address={w.address} rows={w.protocols} onUpdated={load} />
            </div>
          </div>
        ))}
      </div>

      {wallets.length > 0 && (
        <div style={{ marginTop: 24, textAlign: "right", color: "var(--text-dim)", fontSize: 13 }}>
          Total estimated exposure across all wallets:{" "}
          <span className="mono" style={{ color: "var(--accent)", fontSize: 15 }}>
            ~${totalValue.toLocaleString()}
          </span>{" "}
          (speculative — see per-row assumptions)
        </div>
      )}
    </main>
  );
}
