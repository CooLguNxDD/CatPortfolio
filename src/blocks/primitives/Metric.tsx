/** Single metric tile (label + value + optional delta). */
export function Metric({
  label,
  value,
  delta,
}: {
  label?: string;
  value?: string;
  delta?: string;
}) {
  return (
    <div className="rounded-[var(--radius)] border border-(--hairline) bg-(--card) p-3">
      {label ? (
        <div className="text-xs uppercase tracking-wide text-(--fg-subtle)">{label}</div>
      ) : null}
      <div className="mt-1 font-mono text-lg text-(--fg)">{value ?? "—"}</div>
      {delta ? (
        <div className="mt-0.5 text-xs text-(--neon-dim)">{delta}</div>
      ) : null}
    </div>
  );
}
