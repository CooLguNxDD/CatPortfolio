import { Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { fetchAgentStatus } from "@/api/agentStatus"
import snapshot from "@/content/pipeline.json"
import { PipelineSchema } from "@/content/pipelineSchema"
import "@/styles/pipeline.css"

const content = PipelineSchema.parse(snapshot)

/** Reserved enhancement slot: both acts stay readable without motion (including reduced motion). */
function PipelineMotion() {
  return null
}

function PipelineStatus() {
  const { data, isError, isFetching } = useQuery({
    queryKey: ["pipeline", "agent-status"],
    queryFn: () => fetchAgentStatus({ timeoutMs: 2500 }),
    retry: false,
    refetchInterval: 8000,
  })
  const reachable = !!data && !isError
  return (
    <span data-testid="pipeline-status" role="status" aria-busy={isFetching} className="pipeline-status">
      <span aria-hidden="true" className={reachable ? "pipeline-dot is-reachable" : "pipeline-dot"} />
      {reachable ? "backend reachable" : "offline (snapshot)"}
    </span>
  )
}

/** Lazy, text-first public walkthrough. No runner, model calls, canvas or network coordinates. */
export function PipelinePage() {
  const { tailor, serve } = content
  const run = tailor.recordedRun
  return (
    <article className="pipeline-page" aria-labelledby="pipeline-title">
      <header className="pipeline-intro">
        <p className="pipeline-eyebrow">Behind the portfolio</p>
        <h1 id="pipeline-title">{content.title}</h1>
        <p>{content.introduction}</p>
        <PipelineStatus />
        <nav aria-label="Pipeline acts" className="pipeline-act-links">
          <a href="#tailor">Act 1 — Tailor</a>
          <a href="#serve">Act 2 — Serve</a>
        </nav>
      </header>

      <div data-pipeline-motion-slot aria-hidden="true"><PipelineMotion /></div>

      <section id="tailor" data-testid="pipeline-act-tailor" aria-labelledby="tailor-title">
        <p className="pipeline-eyebrow">Posting → tailored pack → ?j= link</p>
        <h2 id="tailor-title">Act 1 — Tailor</h2>
        <p>{tailor.introduction}</p>
        <ol className="pipeline-stages">
          {tailor.stages.map((stage) => (
            <li key={stage.name}>
              <div className="pipeline-stage-heading">
                <h3>{stage.name}</h3>
                <span className="pipeline-llm">LLM: {stage.llm}</span>
              </div>
              <p>{stage.description}</p>
            </li>
          ))}
        </ol>
        <aside className="pipeline-gates" aria-labelledby="gates-title">
          <h3 id="gates-title">Local quality gates</h3>
          <ul>{tailor.qualityGates.map((gate) => <li key={gate}>{gate}</li>)}</ul>
          <p><strong>{tailor.humanReview}</strong></p>
        </aside>

        <div className="pipeline-record" aria-labelledby="record-title">
          <h3 id="record-title">A recorded run, anonymised</h3>
          <dl>
            <div><dt>Role</dt><dd>{run.role}</dd></div>
            <div><dt>Company</dt><dd>{run.company}</dd></div>
            <div><dt>Fit</dt><dd>{run.fit}</dd></div>
            <div><dt>Resume</dt><dd>{run.resume}</dd></div>
            <div><dt>Cover letter</dt><dd>{run.cover}</dd></div>
          </dl>
          <figure className="pipeline-tank">
            <figcaption>
              <span className="pipeline-eyebrow">{run.previewLabel}</span>
              <strong>{run.curationLabel}</strong>
            </figcaption>
            <ul aria-label="Tailored tank specimens">
              {run.specimens.map((fish) => (
                <li key={fish.slug} data-specimen={fish.slug} data-highlighted={fish.highlighted}>
                  <span aria-hidden="true" className="pipeline-fish">➤</span>
                  <strong>{fish.label}</strong>
                  <span>{fish.slug}</span>
                  <span>{fish.highlighted ? "highlighted" : "dimmed"}</span>
                </li>
              ))}
            </ul>
            <p>{run.previewDescription}</p>
          </figure>
        </div>
      </section>

      <section id="serve" data-testid="pipeline-act-serve" aria-labelledby="serve-title">
        <p className="pipeline-eyebrow">The request you just saw</p>
        <h2 id="serve-title">Act 2 — Serve</h2>
        <p>{serve.introduction}</p>
        <ol className="pipeline-hops">
          {serve.hops.map((hop) => <li key={hop.role}><h3>{hop.role}</h3><p>{hop.description}</p></li>)}
        </ol>
        <p>{serve.response}</p>
        <p className="pipeline-gates"><strong>{serve.fallback}</strong></p>
      </section>
      <Link to="/" search={(prev) => prev} className="pipeline-back">← Back to the portfolio</Link>
    </article>
  )
}
