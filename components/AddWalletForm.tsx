"use client";

import { useState } from "react";

export function AddWalletForm({ onAdded }: { onAdded: () => void }) {
  const [address, setAddress] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/wallet/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: address.trim(), label: label.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add wallet.");
      setAddress("");
      setLabel("");
      onAdded();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <input
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="0x wallet address"
        required
        className="mono"
        style={inputStyle}
      />
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="label (optional)"
        style={{ ...inputStyle, width: 140 }}
      />
      <button type="submit" disabled={busy} style={buttonStyle}>
        {busy ? "Scanning chains…" : "Add wallet"}
      </button>
      {error && <span style={{ color: "var(--warn)", fontSize: 13 }}>{error}</span>}
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  padding: "8px 10px",
  borderRadius: 6,
  fontSize: 13,
  minWidth: 260,
};

const buttonStyle: React.CSSProperties = {
  background: "var(--accent)",
  color: "#0a0d0a",
  border: "none",
  padding: "8px 14px",
  borderRadius: 6,
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};
