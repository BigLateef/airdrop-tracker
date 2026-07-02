"use client";

import { useState } from "react";

type Task = { id: number; title: string; done: boolean };

export function TaskChecklist({
  address,
  protocolSlug,
  tasks,
  onUpdated,
}: {
  address: string;
  protocolSlug: string;
  tasks: Task[];
  onUpdated: () => void;
}) {
  const [newTitle, setNewTitle] = useState("");
  const [busy, setBusy] = useState(false);

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setBusy(true);
    try {
      await fetch("/api/tasks/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, protocolSlug, title: newTitle.trim() }),
      });
      setNewTitle("");
      onUpdated();
    } finally {
      setBusy(false);
    }
  }

  async function toggle(id: number) {
    await fetch("/api/tasks/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    onUpdated();
  }

  async function remove(id: number) {
    await fetch("/api/tasks/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    onUpdated();
  }

  return (
    <div style={{ padding: "8px 8px 12px", background: "var(--surface-2)", borderTop: "1px dashed var(--border)" }}>
      {tasks.length === 0 && (
        <div style={{ color: "var(--text-dim)", fontSize: 12, marginBottom: 8 }}>
          No tasks yet — add the next thing you need to do to increase your exposure here.
        </div>
      )}
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        {tasks.map((t) => (
          <li key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} />
            <span style={{ flex: 1, textDecoration: t.done ? "line-through" : "none", color: t.done ? "var(--text-dim)" : "var(--text)" }}>
              {t.title}
            </span>
            <button onClick={() => remove(t.id)} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: 12 }}>
              ✕
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={addTask} style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="e.g. bridge >$1k to hit tier 3"
          style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 4, padding: "4px 8px", fontSize: 12 }}
        />
        <button type="submit" disabled={busy} style={{ background: "var(--accent)", color: "#0a0d0a", border: "none", borderRadius: 4, padding: "4px 10px", fontSize: 12, cursor: "pointer" }}>
          add
        </button>
      </form>
    </div>
  );
}
