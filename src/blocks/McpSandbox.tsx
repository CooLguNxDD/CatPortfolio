/**
 * Mock OpenCat MCP tool sandbox — client-only demo (no PHI, no live backend).
 * Ported from OD cat-portfolio-system prototypes/matrix-home.html.
 */

import { useState } from "react";
import { cn } from "@/lib/utils";

const TOOL_DEMOS: Record<
  string,
  {
    args: Record<string, unknown>;
    latencyMs: number;
    confidence: number;
    route: string[];
    result: Record<string, unknown>;
  }
> = {
  classify_patient_response: {
    args: { text: "feeling worse today, cough", lang: "en" },
    latencyMs: 42,
    confidence: 0.91,
    route: ["classify_patient_response", "get_patient_alerts"],
    result: { label: "NOT_OK", urgency: "elevated", reason: "symptom_worsening" },
  },
  query_clinical_dictionary: {
    args: { term: "SpO2" },
    latencyMs: 28,
    confidence: 0.96,
    route: ["query_clinical_dictionary"],
    result: {
      term: "SpO2",
      definition: "Peripheral capillary oxygen saturation",
    },
  },
  list_not_ok_patients: {
    args: { clinic_id: "demo", window_days: 7 },
    latencyMs: 67,
    confidence: 0.88,
    route: ["list_not_ok_patients", "search_patients"],
    result: { count: 3, note: "demo ids only — no PHI" },
  },
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Interactive MCP mock terminal for matrix L3. */
export function McpSandbox(_props: Record<string, unknown> = {}) {
  const [lines, setLines] = useState<string[]>([
    `<span class="dim">// OpenCat MCP mock inspector · ready</span>`,
    `<span class="prompt">mcp&gt;</span> <span class="dim">select a tool to stream a demo invoke…</span><span class="sandbox-cursor"></span>`,
  ]);
  const [busy, setBusy] = useState(false);

  const runTool = async (name: string) => {
    const demo = TOOL_DEMOS[name];
    if (!demo || busy) return;
    setBusy(true);
    setLines([
      `<span class="dim">// vector route · mock OpenCat gateway</span>`,
      `<span class="prompt">mcp&gt;</span> <span class="cmd">tools/call ${name}</span>`,
      `<span class="dim">args ${JSON.stringify(demo.args)}</span>`,
    ]);
    await sleep(280);
    setLines((prev) => [
      ...prev,
      `<span class="lat">pgvector top-k → ${demo.route.join(" · ")} · conf ${demo.confidence.toFixed(2)}</span>`,
    ]);
    await sleep(220);
    setLines((prev) => [
      ...prev,
      `<span class="ok">✓ stream ${demo.latencyMs}ms</span>`,
    ]);
    await sleep(180);
    setLines((prev) => [
      ...prev,
      `<span class="json">${JSON.stringify(demo.result, null, 2)}</span>`,
      `<span class="prompt">mcp&gt;</span> <span class="sandbox-cursor"></span>`,
    ]);
    setBusy(false);
  };

  return (
    <article
      className="mx-card h-full"
      data-domain="ai"
      data-tech="MCP pgvector"
      style={{ ["--card-accent" as string]: "var(--accent-ai)" }}
    >
      <div className="text-[0.72rem] font-mono uppercase tracking-[0.16em] text-(--fg-subtle)">
        Live demo · mock MCP sandbox
      </div>
      <h3 className="mt-1 text-[1.05rem] font-bold text-(--fg)">
        Trigger a sample clinical tool
      </h3>
      <p className="mt-1 text-[0.82rem] text-(--fg-muted)">
        Simulated stream — no PHI, no live backend. Shows routing latency +
        confidence.
      </p>
      <div className="sandbox mt-3">
        <div className="sandbox-toolbar">
          {Object.keys(TOOL_DEMOS).map((name) => (
            <button
              key={name}
              type="button"
              disabled={busy}
              data-tool={name}
              onClick={() => void runTool(name)}
              className={cn(
                "font-mono text-[0.72rem] px-2.5 py-1.5 rounded-full border border-(--hairline)",
                "text-(--fg-muted) hover:text-(--fg) hover:border-(--amber)/50",
                "disabled:opacity-50 transition-colors",
              )}
            >
              {name}
            </button>
          ))}
        </div>
        <div
          className="sandbox-term"
          aria-live="polite"
          // Demo-only HTML from our own line templates (no user input).
          dangerouslySetInnerHTML={{
            __html: lines.map((l) => `<div>${l}</div>`).join(""),
          }}
        />
      </div>
    </article>
  );
}
