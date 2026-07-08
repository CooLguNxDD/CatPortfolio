# Compile Layout Pipeline

The compilation pipeline translates human-editable (and agent-editable) source configuration into the strict JSON layout data loaded by the CatPortfolio application runtime. It acts as a gatekeeper, guaranteeing that only valid, Zod-verified blocks reach the `LayoutRenderer`.

## End-to-End Flow

1. **Source of Truth**: All layout modifications originate in `design/layout.yaml`. This file is designed for easy authoring by humans and agents alike.
2. **Compilation**: Running `npm run compile:layout` executes `scripts/compile-layout.ts`.
   - The script parses `design/layout.yaml`.
   - It rigorously validates the parsed data against `LayoutSchema` (from `src/content/schema.ts`).
   - If validation passes, the output is written to `src/content/layout.json`.
3. **Runtime Rendering**: The React frontend (`src/routes/HomePage.tsx`) imports `layout.json` (via synchronous loading `loadLayout.ts`). The `LayoutRenderer` then matches each block `type` against the whitelisted component registry (`src/render/registry.ts`) and mounts the respective visual component.

## Headless Generation Path

The portfolio includes an automated headless generation path for drafting layouts using the local OCT (Model Context Protocol server) or via a Claude Code plugin.

1. **Local Drafting**: You can seed a draft `design/layout.yaml` layout by running:
   ```bash
   npm run gen:layout -- --audience=<recruiter|hiring-manager|peer|default>
   ```
   This script calls the local OCT (via `OCT_URL`, default `http://localhost:10000`) at the `/portfolio/layout` path to seed a contextual layout design, and then immediately runs the layout compiler.

2. **Agent Flow**: Alternatively, using the `portfolio-gen` Claude Code plugin (from `Weltel-Mcp-Full`):
   ```bash
   claude plugin install portfolio-gen@weltel-oct
   /portfolio-gen "<brief>"
   ```
   The agent edits `design/layout.yaml`, verifies it by compiling, branches, and opens a GitHub PR.

> **Crucial Rule:** The generated output must *always* be reviewed and committed by a human (via a PR). The headless generation step **never** runs automatically in CI or directly pushes to `main`.

## CI Gatekeeper

To ensure that `layout.yaml` and `layout.json` never drift out of sync, CI pipelines enforce the layout sync check:

```bash
npm run check:layout
```

This command runs `scripts/compile-layout.ts --check`. Rather than writing the file, it asserts that compiling the currently committed `design/layout.yaml` produces exactly what is committed in `src/content/layout.json`. If they are out of sync, the CI run immediately exits with an error (status 1), blocking the PR until the developer manually runs `npm run compile:layout` and commits the updated JSON file.
