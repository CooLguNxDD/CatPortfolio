/** Horizontal progress bar (0–100). */
export function Progress({
  value = 0,
  label,
}: {
  value?: number;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="w-full">
      {label ? (
        <div className="mb-1 flex justify-between text-xs text-(--fg-muted)">
          <span>{label}</span>
          <span className="font-mono">{pct}%</span>
        </div>
      ) : null}
      <div className="h-2 overflow-hidden rounded-full bg-(--bg-sunken)">
        <div
          className="h-full rounded-full bg-(--neon)"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
