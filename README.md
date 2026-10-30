# CatPortfolio

Personal portfolio site that **self-renders** from a Zod-validated GenUI layout (`src/content/layout.json`). The layout grows; the React shell stays stable.

OpenCat MCP (“OCT”) can bake job-specific layouts (`?j=<short_id>`), power the homepage ask chat (`?v=text`) via `run_graph`, and serve public REST under `/api/portfolio/...`. Legacy `/ask` URLs redirect to `/`.

## Stack

- React 19 + Vite + TypeScript
- TanStack Router / Query, Zustand preferences
- Zod layout schema (`src/content/schema.ts`) mirrored with OCT `utils/ui_layout_schema.py`
- Local Docker: nginx (`base: /CatPortfolio/`)

## Quick start

```bash
# Install
npm install

# Dev (Vite HMR; set VITE_OCT_URL if not using Docker nginx)
npm run dev

# Compile design/layout.yaml → src/content/layout.json (never edit layout.json by hand)
npm run compile:layout
npm run check:layout

# Unit tests + lint
npm run test
npm run lint

# Production Docker (nginx proxies /api and /mcp to OpenCat)
docker compose up --build
# Open /CatPortfolio/ on the configured local server.
```

Runtime backend URL is loaded from `public/config.json` (see `src/config/runtimeConfig.ts`). Docker injects the same fields via `docker-entrypoint.sh`.

## Profile pieces (drop-in fish, no rebuild)

`public/profile-pieces/` holds self-contained JSON "pieces" that the site fetches at runtime
(`cache: no-store`) and merges into the tank: fish append to the `fishTank` block (same slug =
piece wins, 40-fish cap), optional `timeline` rows go on top of the first timeline block. A
missing index or a bad piece only logs a warning.

```jsonc
// public/profile-pieces/index.json
{ "pieces": ["d3-security.json"] }
// public/profile-pieces/<id>.json
{ "version": 1, "id": "d3-security", "title": "…", "fish": [ /* FishSpecimen, 1..40 */ ],
  "timeline": [ { "date": "2026-09", "title": "…", "body": "…", "tag": "…" } ] }
```

- **Docker box:** `docker-compose.yml` bind-mounts `./public/profile-pieces` read-only over
  `/usr/share/nginx/html/profile-pieces`. Copy the piece into that folder of the checkout, add its
  file name to `index.json`, reload the page. If the container predates the mount, recreate it once:
  `docker compose up -d --force-recreate catportfolio`.
- **Static build / GitHub Pages:** files in `public/profile-pieces/` land in `dist/profile-pieces/`;
  dropping files into an existing `dist/profile-pieces/` also works.
- The loader itself ships in the bundle, so the first deploy needs one image rebuild/release.

## nginx `/api` + `/mcp` proxy

[`nginx.conf`](./nginx.conf) makes the browser talk **same-origin** to the portfolio host:

- `/api/`: public OCT REST (job layouts, layout-for-query, compose, agent-status).
- `/mcp`: MCP Streamable HTTP (`run_graph` for Ask).

The private upstream is supplied at runtime, never documented as a network endpoint.

Timeouts are 600s so long agent turns (with progress keepalives) do not die. `ngrok` variants use `nginx.ngrok.conf`.

## `?j=` job-layout contract

HR-facing resume links open:

```
https://<portfolio-host>/CatPortfolio/?j=<short_id>
```

- `short_id` is minted by OCT `bake_portfolio_for_job` (`utils/short_id.py`: readable `{slug}_{≥10-char alnum suffix}`).
- Home route search schema accepts optional `j` (`src/router.tsx`).
- `loadJobLayout(jobId)` → `GET /api/portfolio/public/layout/{jobId}`; on any failure falls back to the baked snapshot — never hard-fails.
- Without `j`, Home is byte-for-byte the committed layout snapshot.

## Ask / agent envelopes

`src/api/harness.ts` talks to OCT `run_graph` and extracts:

- Chat markdown (`extractMarkdown`)
- GenUI layout carry (`extractCarryLayout` + `LayoutSchema`)
- Bake meta (`extractBakeMeta`)
- One-shot CLI pill (`extractCliMeta`)

Wire envelopes are validated with Zod schemas in the same module (see `GraphEnvelopeSchema` / `BakeMetaSchema`).

## How this portfolio tailors itself

Open `/pipeline` from the navigation or the text view. This lazy-loaded, text-first
walkthrough explains **Act 1 — Tailor** (ten stages, LLM usage, local quality gates,
human review, and an anonymised recorded bake) and **Act 2 — Serve** (service roles,
not network coordinates). The static tank illustration needs no WebGL. Both acts
remain readable with reduced motion and when the status dot reads **offline (snapshot)**.
The page only reads public agent status; it never runs an application pipeline.

Author `design/pipeline.yaml`, then run `npm run compile:pipeline` to generate
`src/content/pipeline.json`. Do not edit the JSON directly. `npm run check:pipeline`
fails on drift; `npm run check:layout` checks both content snapshots. The strict Zod
contract is `src/content/pipelineSchema.ts`, independent of the layout block union.

## Public safety

Run `node scripts/check-public-safety.mjs` after the production build. It checks
tracked text and `dist/` for network addresses, unapproved hostnames and common
secret shapes. It prints only `path:line: rule`, never sensitive matched values.
Use `--files <path>...` for targeted scans. Unit tests plant values at runtime rather
than embedding them in the public source.

Allowlisted public documentation/standards hosts and narrow development exceptions
live in the script with reasons. Lockfiles, binary/vendor assets and the generated
browser test reporter are not authored inputs. Minified JavaScript uses URL-anchored
hostname detection to avoid treating member access as DNS. Never put private network
coordinates or credentials in page content, fixtures, or build output. The edge proxy
holds the API key as a secret; the browser should receive no key.

The [Cloudflare Worker](./cloudflare-worker/README.md) reads its backend hostname
only from `UPSTREAM_HOST` in Worker secrets/dashboard vars. Set it before deploying:
missing/blank configuration returns a clear 500 before any upstream fetch, and gateway
errors never expose upstream details. No backend hostname or account identifier is
stored in Wrangler config. The scanner covers `cloudflare-worker/**`, including its
Node Vitest fixtures. See [CI safety integration](./docs/ci-safety.md) for the
ready-to-paste gitleaks + source/build scan job and local commands; the session
applies it to CI without changing the protected deployment workflow.

## Releases

Published releases use the `meow-<semver>` tag. The first cut is `meow-1.0.1`. Publishing the GitHub Release deploys GitHub Pages. Steps: [`RELEASE.md`](./RELEASE.md).

## Project layout

See [`CLAUDE.md`](./CLAUDE.md) for the full architecture index (matrix DAG, block registry, bake/send, CI gates).

## License

See [LICENSE](./LICENSE).
