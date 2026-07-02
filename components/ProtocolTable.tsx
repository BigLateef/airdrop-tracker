"use client";

import { useState } from "react";
import { TaskChecklist } from "./TaskChecklist";

type Task = { id: number; title: string; done: boolean };

type Row = {
  protocolSlug: string;
  protocolName: string;
  points: number | null;
  pointsSource: string;
  estimatedValueUsd: number | null;
  valueConfidence: "none" | "low" | "speculative" | "live";
  valueExplanation: string;
  lastInteraction: string | null;
  txCount: number;
  pointsSourceType: "api" | "manual";
  pointsSourceNotes: string;
  liveTokenSymbol: string | null;
  tasks: Task[];
};

export function ProtocolTable({ address, rows, onUpdated }: { address: string; rows: Row[]; onUpdated: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <table className="mono" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr style={{ textAlign: "left", color: "var(--text-dim)", fontSize: 11, letterSpacing: 0.5 }}>
          <th style={th}>PROTOCOL</th>
          <th style={th}>POINTS / AMOUNT</th>
          <th style={th}>EST. VALUE</th>
          <th style={th}>LAST INTERACTION</th>
          <th style={th}>ACTIVITY</th>
          <th style={th}>TASKS</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <ProtocolRow
            key={r.protocolSlug}
            address={address}
            row={r}
            onUpdated={onUpdated}
            expanded={expanded === r.protocolSlug}
            onToggleExpand={() => setExpanded(expanded === r.protocolSlug ? null : r.protocolSlug)}
          />
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={6} style={{ padding: "16px 8px", color: "var(--text-dim)" }}>
              No eligible protocols detected yet on the chains we scan. This wallet may be new, or may not have touched any tracked contract.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function ProtocolRow({
  address,
  row,
  onUpdated,
  expanded,
  onToggleExpand,
}: {
  address: string;
  row: Row;
  onUpdated: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(row.points?.toString() ?? "");
  const [busy, setBusy] = useState(false);
  const doneCount = row.tasks.filter((t) => t.done).length;

  async function saveManual() {
    setBusy(true);
    try {
      await fetch("/api/points/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, protocolSlug: row.protocolSlug, points: Number(value) }),
      });
      setEditing(false);
      onUpdated();
    } finally {
      setBusy(false);
    }
  }

  const valueTag =
    row.valueConfidence === "live" ? (
      <span style={{ color: "var(--accent)", fontSize: 10 }}> (live)</span>
    ) : row.valueConfidence === "speculative" ? (
      <span style={{ color: "var(--text-dim)", fontSize: 10 }}> (guess)</span>
    ) : null;

  return (
    <>
      <tr style={{ borderTop: "1px solid var(--border)" }}>
        <td style={td}>{row.protocolName}</td>
        <td style={td}>
          {editing ? (
            <span style={{ display: "flex", gap: 6 }}>
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                autoFocus
                className="mono"
                style={{ width: 90, background: "var(--surface-2)", border: "1px solid var(--accent)", color: "var(--text)", borderRadius: 4, padding: "2px 6px" }}
              />
              <button onClick={saveManual} disabled={busy} style={miniBtn}>
                {busy ? "…" : "save"}
              </button>
              <button onClick={() => setEditing(false)} style={{ ...miniBtn, background: "transparent", color: "var(--text-dim)" }}>
                cancel
              </button>
            </span>
          ) : (
            <span
              title={row.pointsSourceType === "manual" ? row.pointsSourceNotes : undefined}
              onClick={() => row.pointsSourceType === "manual" && setEditing(true)}
              style={{ cursor: row.pointsSourceType === "manual" ? "pointer" : "default", color: row.points === null ? "var(--text-dim)" : "var(--text)" }}
            >
              {row.points === null ? "— set manually" : row.points.toLocaleString()}
              {row.liveTokenSymbol && row.points !== null && <span style={{ color: "var(--text-dim)" }}> {row.liveTokenSymbol}</span>}
              {row.pointsSourceType === "manual" && <span style={{ color: "var(--text-dim)", fontSize: 10 }}> ✎</span>}
            </span>
          )}
        </td>
        <td style={td} title={row.valueExplanation}>
          {row.estimatedValueUsd === null ? (
            <span style={{ color: "var(--text-dim)" }}>—</span>
          ) : (
            <span style={{ color: "var(--accent)" }}>
              ~${row.estimatedValueUsd.toLocaleString()}
              {valueTag}
            </span>
          )}
        </td>
        <td style={td}>{row.lastInteraction ? new Date(row.lastInteraction).toLocaleDateString() : "—"}</td>
        <td style={td}>{row.txCount} txs</td>
        <td style={td}>
          <button
            onClick={onToggleExpand}
            style={{ background: "none", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text-dim)", fontSize: 11, padding: "3px 8px", cursor: "pointer" }}
          >
            {doneCount}/{row.tasks.length} {expanded ? "▲" : "▼"}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} style={{ padding: 0 }}>
            <TaskChecklist address={address} protocolSlug={row.protocolSlug} tasks={row.tasks} onUpdated={onUpdated} />
          </td>
        </tr>
      )}
    </>
  );
}

const th: React.CSSProperties = { padding: "6px 8px", fontWeight: 500 };
const td: React.CSSProperties = { padding: "8px", verticalAlign: "middle" };
const miniBtn: React.CSSProperties = {
  background: "var(--accent)",
  color: "#0a0d0a",
  border: "none",
  borderRadius: 4,
  padding: "2px 8px",
  fontSize: 11,
  cursor: "pointer",
};
