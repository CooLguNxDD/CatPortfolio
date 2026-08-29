/** Minimal SVG sparkline from a number series. */
export function Sparkline({
  points = [],
  width = 96,
  height = 28,
}: {
  points?: number[];
  width?: number;
  height?: number;
}) {
  if (!points.length) {
    return <div className="h-7 w-24 rounded bg-(--bg-sunken)" />;
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const pad = 2;
  const coords = points.map((y, i) => {
    const x = pad + (i / Math.max(points.length - 1, 1)) * (width - pad * 2);
    const yy = height - pad - ((y - min) / range) * (height - pad * 2);
    return `${x},${yy}`;
  });
  const d = `M ${coords.join(" L ")}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <path d={d} fill="none" stroke="var(--card-accent, var(--amber))" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
