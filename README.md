# CatPortfolio

Personal portfolio site that **self-renders** from a Zod-validated GenUI layout (`src/content/layout.json`). The layout grows; the React shell stays stable.

OpenCat MCP (“OCT”) can bake job-specific layouts (`?j=<short_id>`), power the `/ask` chat via `run_graph`, and serve public REST under `/api/portfolio/...`.

## Stack

- React 19 + Vite + TypeScript
- TanStack Router / Query, Zustand preferences
- Zod layout schema (`src/content/schema.ts`) mirrored with OCT `utils/ui_layout_schema.py`
- Local Docker: nginx on **localhost:11000** (`base: /CatPortfolio/`)

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

# Production Docker (nginx :11000 proxies /api and /mcp to OpenCat)
docker compose up --build
# open http://localhost:11000/CatPortfolio/
```

Runtime backend URL is loaded from `public/config.json` (see `src/config/runtimeConfig.ts`). Docker injects the same fields via `docker-entrypoint.sh`.

## nginx `/api` + `/mcp` proxy

[`nginx.conf`](./nginx.conf) makes the browser talk **same-origin** to the portfolio host:

| Path | Upstream (default) | Purpose |
|------|--------------------|---------|
| `/api/` | `host.docker.internal:10000/api/` | Public OCT REST (job layouts, layout-for-query, compose, agent-status) |
| `/mcp` | `host.docker.internal:10000/mcp` | MCP Streamable HTTP (`run_graph` for Ask) |

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

## Project layout

See [`CLAUDE.md`](./CLAUDE.md) for the full architecture index (matrix DAG, block registry, bake/send, CI gates).

## License

See [LICENSE](./LICENSE).
