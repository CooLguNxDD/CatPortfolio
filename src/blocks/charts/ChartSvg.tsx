import { CHART_COLORS, type Series, xLabels, yDomain } from "./scale";

const W = 360;
const H = 160;
const PAD = { t: 12, r: 12, b: 28, l: 36 };

function plotBox() {
  return {
    x0: PAD.l,
    y0: PAD.t,
    w: W - PAD.l - PAD.r,
    h: H - PAD.t - PAD.b,
  };
}

export function BarChart({ series }: { series: Series[] }) {
  const labels = xLabels(series);
  const { min, max } = yDomain(series);
  const box = plotBox();
  const n = Math.max(labels.length, 1);
  const groupW = box.w / n;
  const barW = Math.max(4, (groupW * 0.7) / Math.max(series.length, 1));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full max-w-md" role="img">
      {series.map((s, si) =>
        s.points.map((p, i) => {
          const y = Number(p.y) || 0;
          const h = ((y - min) / (max - min)) * box.h;
          const x = box.x0 + i * groupW + groupW * 0.15 + si * barW;
          return (
            <rect
              key={`${si}-${i}`}
              x={x}
              y={box.y0 + box.h - h}
              width={barW}
              height={Math.max(h, 0)}
              fill={CHART_COLORS[si % CHART_COLORS.length]}
              opacity={0.9}
            />
          );
        }),
      )}
      {labels.map((lab, i) => (
        <text
          key={lab + i}
          x={box.x0 + i * groupW + groupW / 2}
          y={H - 8}
          textAnchor="middle"
          className="fill-(--fg-subtle)"
          fontSize={9}
        >
          {lab}
        </text>
      ))}
    </svg>
  );
}

export function LineChart({ series, area = false }: { series: Series[]; area?: boolean }) {
  const labels = xLabels(series);
  const { min, max } = yDomain(series);
  const box = plotBox();
  const n = Math.max(labels.length - 1, 1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full max-w-md" role="img">
      {series.map((s, si) => {
        const pts = s.points.map((p, i) => {
          const x = box.x0 + (i / n) * box.w;
          const y = box.y0 + box.h - ((Number(p.y) - min) / (max - min)) * box.h;
          return { x, y };
        });
        if (!pts.length) return null;
        const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
        const color = CHART_COLORS[si % CHART_COLORS.length];
        return (
          <g key={s.name + si}>
            {area ? (
              <path
                d={`${d} L ${pts[pts.length - 1].x} ${box.y0 + box.h} L ${pts[0].x} ${box.y0 + box.h} Z`}
                fill={color}
                opacity={0.15}
              />
            ) : null}
            <path d={d} fill="none" stroke={color} strokeWidth={2} />
          </g>
        );
      })}
    </svg>
  );
}

export function DonutChart({ series }: { series: Series[] }) {
  const values = series[0]?.points ?? [];
  const total = values.reduce((a, p) => a + (Number(p.y) || 0), 0) || 1;
  const cx = W / 2;
  const cy = H / 2;
  const r = 52;
  const ir = 30;
  let angle = -Math.PI / 2;

  const arcs = values.map((p, i) => {
    const v = Number(p.y) || 0;
    const sweep = (v / total) * Math.PI * 2;
    const a0 = angle;
    const a1 = angle + sweep;
    angle = a1;
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    const xi0 = cx + ir * Math.cos(a1);
    const yi0 = cy + ir * Math.sin(a1);
    const xi1 = cx + ir * Math.cos(a0);
    const yi1 = cy + ir * Math.sin(a0);
    const large = sweep > Math.PI ? 1 : 0;
    const d = [
      `M ${x0} ${y0}`,
      `A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`,
      `L ${xi0} ${yi0}`,
      `A ${ir} ${ir} 0 ${large} 0 ${xi1} ${yi1}`,
      "Z",
    ].join(" ");
    return (
      <path
        key={i}
        d={d}
        fill={CHART_COLORS[i % CHART_COLORS.length]}
        opacity={0.9}
      />
    );
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full max-w-md" role="img">
      {arcs}
    </svg>
  );
}

export function RadarChart({ series }: { series: Series[] }) {
  const labels = xLabels(series);
  const n = Math.max(labels.length, 3);
  const { max } = yDomain(series);
  const cx = W / 2;
  const cy = H / 2;
  const r = 55;

  const poly = (pts: number[]) =>
    pts
      .map((v, i) => {
        const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
        const rr = (v / max) * r;
        return `${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`;
      })
      .join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full max-w-md" role="img">
      {[0.25, 0.5, 0.75, 1].map((t) => (
        <polygon
          key={t}
          points={poly(Array.from({ length: n }, () => max * t))}
          fill="none"
          stroke="var(--hairline)"
          strokeWidth={1}
        />
      ))}
      {series.map((s, si) => {
        const vals = Array.from({ length: n }, (_, i) => Number(s.points[i]?.y) || 0);
        return (
          <polygon
            key={s.name + si}
            points={poly(vals)}
            fill={CHART_COLORS[si % CHART_COLORS.length]}
            opacity={0.2}
            stroke={CHART_COLORS[si % CHART_COLORS.length]}
            strokeWidth={1.5}
          />
        );
      })}
    </svg>
  );
}
