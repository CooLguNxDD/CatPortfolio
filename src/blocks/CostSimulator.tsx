/**
 * AWS cost reduction simulator — interactive OD matrix L4 demo.
 * Defaults approximate published −30% outcome ($4150 → ~$2800).
 */

import { useMemo, useState } from "react";

const BASE = 4150;
const POOL = { runners: 900, nat: 320, spot: 200 };

/** Interactive AWS cost levers for matrix L4. */
export function CostSim(_props: Record<string, unknown> = {}) {
  const [runners, setRunners] = useState(70);
  const [nat, setNat] = useState(55);
  const [spot, setSpot] = useState(40);

  const { after, saved, pct, hA } = useMemo(() => {
    const r = runners / 100;
    const n = nat / 100;
    const s = spot / 100;
    const raw = Math.round(POOL.runners * r + POOL.nat * n + POOL.spot * s);
    const afterVal = Math.max(1800, BASE - raw);
    const savedVal = BASE - afterVal;
    return {
      after: afterVal,
      saved: savedVal,
      pct: Math.round((savedVal / BASE) * 100),
      hA: Math.max(12, Math.round((afterVal / BASE) * 100)),
    };
  }, [runners, nat, spot]);

  return (
    <article
      className="mx-card h-full"
      data-domain="devops"
      data-tech="EKS Terraform"
      style={{ ["--card-accent" as string]: "var(--accent-devops)" }}
    >
      <div className="text-[0.72rem] font-mono uppercase tracking-[0.16em] text-(--fg-subtle)">
        Interactive · ROI
      </div>
      <h3 className="mt-1 text-[1.05rem] font-bold text-(--fg)">
        AWS cost reduction simulator
      </h3>
      <p className="mt-1 text-[0.82rem] text-(--fg-muted)">
        Drag levers · baseline ~$4,150 → optimized ~$2,800 (defaults match
        reported outcome)
      </p>

      <div className="cost-calc mt-3">
        <div className="cost-sliders">
          <div className="cost-row">
            <label>
              <span>Self-hosted EKS runners</span>
              <span>{runners}%</span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={runners}
              onChange={(e) => setRunners(Number(e.target.value))}
            />
          </div>
          <div className="cost-row">
            <label>
              <span>NAT / multi-AZ VPC trim</span>
              <span>{nat}%</span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={nat}
              onChange={(e) => setNat(Number(e.target.value))}
            />
          </div>
          <div className="cost-row">
            <label>
              <span>RI / spot mix</span>
              <span>{spot}%</span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={spot}
              onChange={(e) => setSpot(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="cost-totals">
          <div className="cost-tot" style={{ ["--card-accent" as string]: "var(--fg-muted)" }}>
            <div className="lbl">Before</div>
            <div className="val">${BASE.toLocaleString()}</div>
          </div>
          <div className="cost-tot" style={{ ["--card-accent" as string]: "var(--accent-devops)" }}>
            <div className="lbl">After</div>
            <div className="val">${after.toLocaleString()}</div>
          </div>
          <div className="cost-tot save">
            <div className="lbl">Saved / mo</div>
            <div className="val">${saved.toLocaleString()}</div>
          </div>
        </div>

        <svg
          className="w-full max-w-sm mt-1"
          viewBox="0 0 320 150"
          role="img"
          aria-label="Before after cost bars"
        >
          <line x1="48" y1="15" x2="48" y2="120" stroke="var(--hairline)" />
          <line x1="48" y1="120" x2="300" y2="120" stroke="var(--hairline)" />
          <rect
            x="90"
            y={20}
            width="56"
            height="100"
            rx="6"
            fill="color-mix(in oklch, var(--accent-devops) 35%, transparent)"
            stroke="var(--accent-devops)"
            strokeWidth="1.5"
          />
          <rect
            x="190"
            y={120 - hA}
            width="56"
            height={hA}
            rx="6"
            fill="var(--accent-devops)"
            opacity="0.92"
          />
          <text
            x="118"
            y="16"
            textAnchor="middle"
            fill="var(--fg)"
            fontSize="11"
            fontFamily="var(--mono)"
            fontWeight="700"
          >
            ${BASE}
          </text>
          <text
            x="218"
            y={120 - hA - 4}
            textAnchor="middle"
            fill="var(--neon)"
            fontSize="11"
            fontFamily="var(--mono)"
            fontWeight="700"
          >
            ${after}
          </text>
          <text
            x="118"
            y="136"
            textAnchor="middle"
            fill="var(--fg-muted)"
            fontSize="10"
            fontFamily="var(--mono)"
          >
            Legacy
          </text>
          <text
            x="218"
            y="136"
            textAnchor="middle"
            fill="var(--fg-muted)"
            fontSize="10"
            fontFamily="var(--mono)"
          >
            Optimized
          </text>
        </svg>

        <p className="text-[0.72rem] font-mono text-(--fg-subtle)">
          Saved ${saved}/mo ({pct}%). Demo model — defaults approx reported −30%.
        </p>
      </div>
    </article>
  );
}
