# Sources Configuration

External context constraints for headless portfolio generation are defined dynamically in `design/sources.yaml`. This ensures agents pull current reference context when generating `layout.yaml`.

## Sources Schema

The valid structure of `sources.yaml` is enforced by Zod via `scripts/sources-schema.ts`. It takes the shape of a JSON/YAML object containing a `version` and a `sources` array.

Every source entry must have a unique `id`, a discriminated string `kind`, and optionally `use` (array of strings) and `project` (string) fields. The core distinction is the `kind` of source and how its target `ref` is validated:

- **`github`**: Requires a `ref` in the "owner/repo" format (e.g., `"CooLguNxDD/CatPortfolio"`).
- **`url`**: Requires a `ref` that is a valid HTTPS URL.
- **`notion`**: Requires a non-empty string `ref` representing a Notion page ID or URL.
- **`gdoc`**: Requires a non-empty string `ref` representing a Google Doc ID or URL.
- **`search`**: Requires a non-empty string `ref` representing a search query string.

## Context Resolution

When the generation pipeline runs, it parses `design/sources.yaml` and resolves the sources differently depending on the operating environment.

### 1. OCT Online Resolution (Local/Agent)
When generating locally or through the Claude Code agent where the OCT MCP server is accessible (proxy layer SSRF client is online):
- Resolution acts primarily through MCP tools.
- Uses **`fetch_external_context`** for general source fetching.
- Uses **`get_project_context`** for repository-based contextual pulling.

### 2. CI Offline Fallback (OCT Unreachable)
When running in a CI/CD context where the OCT MCP proxy is unavailable, the pipeline defaults to fallback mechanisms:
- **`github`** sources: Researched securely using `gh api` and the workflow's `GITHUB_TOKEN`.
- **`url`** & **`gdoc`** sources: Crawled using native `WebFetch`.
- **`notion`** & **`search`** sources: Immediately skipped in the offline fallback mode due to hard auth/API constraints.

## Generation Guiding Rules

When authoring or executing generation tasks with `sources.yaml`:

1. **Graceful Degradation**: Never block generation on an unreachable source. If a source fails to load or is skipped (e.g. `notion` in CI), the pipeline should generate using whatever partial context is successfully resolved.
2. **Transparency**: The pipeline agent should explicitly note skipped or failed sources in the generated Pull Request body, allowing developers to manually inspect the omission.
