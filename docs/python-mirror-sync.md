# Python Mirror Sync

CatPortfolio's layout structure is strongly typed using Zod on the frontend (`src/content/schema.ts`). However, because headless generation tasks occur via the server-side OCT MCP platform, an identical schema contract exists on the Python side (`Weltel-Mcp-Full/utils/ui_layout_schema.py`) using Pydantic.

It is critical that these two schema definitions maintain strict parity.

## The Source of Truth: Mirror Manifest

The file `design/mirror-manifest.json` tracks the block types that are currently known to exist and sync on the Python side. The `scripts/__tests__/mirror-drift.test.ts` test reads this manifest to verify that CatPortfolio's `schema.ts` does not contain any block types unsupported by the backend without proper asynchronous tracking.

## Developing Schema Changes

Whenever you modify the TypeScript layout schema (such as altering block constraints or introducing a new block type), you must coordinate the change with the Python mirror.

There are two valid workflows for modifying the schema:

### 1. Simultaneous PRs (Synchronous Sync)
The preferred method is to update the contracts in both repositories at the same time:
1. Make your changes to `src/content/schema.ts` in CatPortfolio.
2. Make matching changes to `utils/ui_layout_schema.py` (Pydantic schema) in Weltel-Mcp-Full.
3. If adding a new block type, update the `pythonMirrorBlockTypes` array and `lastSynced` date in `design/mirror-manifest.json`.

### 2. The Pending Mirror Workflow (Asynchronous Sync)
If the Python side (OCT) cannot be updated immediately, you can introduce breaking schema changes or new blocks to the frontend using the `pending-mirror/` workflow.

1. Modify `src/content/schema.ts` with your new block or constraints.
2. Instead of updating the manifest immediately, create a Markdown file in `design/pending-mirror/` detailing the required backend Pydantic patches.
   - **Format:** `design/pending-mirror/<yyyy-mm-dd>-<type>.md` (e.g., `design/pending-mirror/2026-07-08-newFeatureBlock.md`).
3. This markdown document serves as a "sync debt" ticket that the `scripts/__tests__/mirror-drift.test.ts` test will recognize, allowing your PR to pass CI.
4. Once the backend Weltel-Mcp-Full repo lands the Pydantic changes, you must come back to CatPortfolio to delete the pending mirror markdown document and officially update `design/mirror-manifest.json` with the new block type.

By strictly adhering to these workflows, CatPortfolio ensures that agent-generated drafts from OCT are always correctly typed and predictable when compiled into `layout.json`.
