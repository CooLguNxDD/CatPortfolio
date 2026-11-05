import { Component, lazy, Suspense, type ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { fetchAgentStatus } from "@/api/agentStatus"
import snapshot from "@/content/pipeline.json"
import { PipelineSchema } from "@/content/pipelineSchema"
import "@/styles/pipeline.css"

const content = PipelineSchema.parse(snapshot)

/** Progressive enhancement in its own chunk: both acts stay readable without it (reduced motion, JS errors, chunk failure). */
const PipelineMotion = lazy(() => import("@/pipeline/PipelineMotion"))

/** A failed motion chunk renders nothing; the text page stays intact. */
class MotionBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: Error) {
    console.warn("[PipelinePage] motion enhancement failed:", error)
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

function PipelineStatus() {
  const { data, isError, isFetching, isPending } = useQuery({
    queryKey: ["pipeline", "agent-status"],
    queryFn: () => fetchAgentStatus({ timeoutMs: 2500 }),
    retry: false,
    refetchInterval: 8000,
  })
  const reachable = !!data && !isError
  // First probe still in flight: neither verdict is known yet. Later refetches keep the last verdict.
  const label = isPending ? "checking backend" : reachable ? "backend reachable" : "offline (snapshot)"
  return (
    <span data-testid="pipeline-status" role="status" aria-busy={isFetching} className="pipeline-status">
      <span aria-hidden="true" className={reachable ? "pipeline-dot is-reachable" : "pipeline-dot"} />
      {label}
    </span>
  )
}

const LLM_LABEL = { yes: "LLM", partly: "Partly LLM", no: "Deterministic" } as const

/** Lazy, text-first public walkthrough. No runner, model calls, canvas or network coordinates. */
export function PipelinePage() {
  const { tailor, serve } = content
  const run = tailor.recordedRun
  const llmStages = tailor.stages.filter((s) => s.llm !== "no").length
  return (
    <article className="pipeline-page" aria-labelledby="pipeline-title">
      <header className="pipeline-intro">
        <div className="pipeline-intro-top">
          <p className="pipeline-eyebrow">Behind the portfolio</p>
          <PipelineStatus />
        </div>
        <h1 id="pipeline-title">{content.title}</h1>
        <p className="pipeline-lede">{content.introduction}</p>
        <nav aria-label="Pipeline acts" className="pipeline-act-links">
          <a href="#tailor" data-act="tailor">
            <span className="pipeline-act-num" aria-hidden="true">1</span>
            <span><strong>Act 1 — Tailor</strong><small>{tailor.stages.length} stages · {llmStages} use a model</small></span>
          </a>
          <a href="#serve" data-act="serve">
            <span className="pipeline-act-num" aria-hidden="true">2</span>
            <span><strong>Act 2 — Serve</strong><small>{serve.hops.length} hops · there and back</small></span>
          </a>
        </nav>
      </header>

      <div data-pipeline-motion-slot>
        <MotionBoundary><Suspense fallback={null}><PipelineMotion content={content} /></Suspense></MotionBoundary>
      </div>

      <section id="tailor" data-act="tailor" data-testid="pipeline-act-tailor" aria-labelledby="tailor-title">
        <p className="pipeline-eyebrow">Posting → tailored pack → ?j= link</p>
        <h2 id="tailor-title">Act 1 — Tailor</h2>
        <p className="pipeline-section-intro">{tailor.introduction}</p>
        <ul className="pipeline-legend" aria-label="Stage legend">
          {(["yes", "partly", "no"] as const).map((k) => (
            <li key={k}><span className="pipeline-llm" data-llm={k}>{LLM_LABEL[k]}</span></li>
          ))}
        </ul>
        <ol className="pipeline-stages pipeline-steps" role="list">
          {tailor.stages.map((stage, i) => (
            <li key={stage.id} data-stop-id={stage.id}>
              <span className="pipeline-step-num" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
              <div className="pipeline-step-body">
                <div className="pipeline-stage-heading">
                  <h3>{stage.name}</h3>
                  <span className="pipeline-llm" data-llm={stage.llm}>{LLM_LABEL[stage.llm]}</span>
                </div>
                <p>{stage.description}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="pipeline-grid">
          <aside className="pipeline-gates pipeline-card" aria-labelledby="gates-title">
            <h3 id="gates-title">Local quality gates</h3>
            <ul className="pipeline-checks">{tailor.qualityGates.map((gate) => <li key={gate}>{gate}</li>)}</ul>
            <p className="pipeline-callout"><strong>{tailor.humanReview}</strong></p>
          </aside>

          <div className="pipeline-record pipeline-card" aria-labelledby="record-title">
            <h3 id="record-title">A recorded run, anonymised</h3>
            <div className="pipeline-fit">
              <span className="pipeline-fit-score">{run.fit}</span>
              <span className="pipeline-fit-label">fit score</span>
            </div>
            <dl>
              <div><dt>Role</dt><dd>{run.role}</dd></div>
              <div><dt>Company</dt><dd>{run.company}</dd></div>
              <div><dt>Resume</dt><dd>{run.resume}</dd></div>
              <div><dt>Cover letter</dt><dd>{run.cover}</dd></div>
            </dl>
          </div>
        </div>

        <figure className="pipeline-tank pipeline-card">
          <figcaption>
            <span className="pipeline-eyebrow">{run.previewLabel}</span>
            <strong>{run.curationLabel}</strong>
          </figcaption>
          <ul aria-label="Tailored tank specimens">
            {run.specimens.map((fish) => (
              <li key={fish.slug} data-specimen={fish.slug} data-highlighted={fish.highlighted}>
                <span aria-hidden="true" className="pipeline-fish">➤</span>
                <strong>{fish.label}</strong>
                <span className="pipeline-slug">{fish.slug}</span>
                <span className="pipeline-state">{fish.highlighted ? "highlighted" : "dimmed"}</span>
              </li>
            ))}
          </ul>
          <p>{run.previewDescription}</p>
        </figure>
      </section>

      <section id="serve" data-act="serve" data-testid="pipeline-act-serve" aria-labelledby="serve-title">
        <p className="pipeline-eyebrow">The request you just saw</p>
        <h2 id="serve-title">Act 2 — Serve</h2>
        <p className="pipeline-section-intro">{serve.introduction}</p>
        <ol className="pipeline-hops pipeline-steps" role="list">
          {serve.hops.map((hop, i) => (
            <li key={hop.id} data-stop-id={hop.id}>
              <span className="pipeline-step-num" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
              <div className="pipeline-step-body"><h3>{hop.role}</h3><p>{hop.description}</p></div>
            </li>
          ))}
        </ol>
        <p className="pipeline-return">↩ {serve.response}</p>
        <p className="pipeline-gates pipeline-callout pipeline-fallback"><strong>{serve.fallback}</strong></p>
      </section>
      <Link to="/" search={(prev) => prev} className="pipeline-back">← Back to the portfolio</Link>
    </article>
  )
}
