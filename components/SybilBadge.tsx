"use client";

export function SybilBadge({ score, reasons }: { score: number; reasons: string[] }) {
  const level = score >= 60 ? "high" : score >= 30 ? "medium" : "low";
  const colors = {
    low: { bg: "rgba(159,239,90,0.12)", fg: "#9fef5a", label: "LOW RISK" },
    medium: { bg: "rgba(255,196,74,0.12)", fg: "#ffc44a", label: "WATCH" },
    high: { bg: "rgba(255,107,74,0.14)", fg: "#ff6b4a", label: "HIGH RISK" },
  }[level];

  return (
    <span
      title={reasons.join(" ")}
      className="mono"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 8px",
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 0.4,
        background: colors.bg,
        color: colors.fg,
        border: `1px solid ${colors.fg}33`,
        cursor: "help",
      }}
    >
      {colors.label} · {score}
    </span>
  );
}
