# Layout Schema Contract

The `LayoutSchema` contract defines the exact structure for rendering layout blocks in CatPortfolio. This contract is strictly enforced by Zod validation upon loading any layout, meaning that a violation fails loudly and guarantees safety.

The schema is primarily a **discriminated union** over the block's `type` field, allowing the application to safely map an abstract specification to a React component at runtime via a whitelisted block registry.

## Shared Primitives
Several field types are reused across different block schemas:
- **`Link`**: An object containing a `label` (string) and an `href` (valid URL string).
- **`Stat`**: An object containing a `label` (string) and a `value` (string).

## The 7 Block Types

Every block must contain:
- `type`: A specific literal string identifier (the discriminator).
- `id`: A unique string identifier for the block.
- `props`: An object containing block-specific properties, outlined below.

### 1. `hero`
Represents the primary hero section, typically at the very top of a layout.
**Props Constraints:**
- `name` (string): The subject's name.
- `tagline` (string): A short, punchy tagline.
- `pitch` (optional string): A longer, descriptive pitch or introduction.
- `links` (optional array of `Link`): Navigation or call-to-action links.

### 2. `projectGrid`
A grid of projects, detailing overviews and relevant metrics.
**Props Constraints:**
- `projects` (array of objects):
  - `id` (string): Unique identifier for the project.
  - `name` (string): Project name.
  - `summary` (string): Short summary of the project.
  - `tags` (array of strings, default `[]`): Relevant technology or domain tags.
  - `metrics` (array of `Stat`, default `[]`): Quantifiable outcomes or sizes.
  - `links` (array of `Link`, default `[]`): Relevant project links (e.g., GitHub, live site).

### 3. `statStrip`
A horizontal strip meant to highlight a few key statistics.
**Props Constraints:**
- `stats` (array of `Stat`): A list of statistics containing `label` and `value`.

### 4. `starStory`
A behavioral narrative block structured using the STAR method (Situation, Task, Action, Result).
**Props Constraints:**
- `situation` (string): The context or background.
- `task` (string): The challenge or goal.
- `action` (string): The steps taken.
- `result` (string): The outcome.
- `tags` (array of strings, default `[]`): Relevant tags to the story.

### 5. `archDiagram`
Displays an architecture diagram, either as an embedded SVG or rendered using Mermaid.
**Props Constraints:**
- `title` (string): The title of the diagram.
- `kind` (enum: `"mermaid" | "svg"`): The format of the diagram source.
- `source` (string): The raw diagram definition (Mermaid string) or SVG data.

### 6. `codeSnippet`
Highlights a block of code with syntax highlighting.
**Props Constraints:**
- `lang` (string): The programming language for syntax highlighting.
- `code` (string): The literal code string to display.
- `caption` (optional string): An explanatory caption.

### 7. `prose`
Standard text content parsed as GitHub-flavored Markdown.
**Props Constraints:**
- `markdown` (string): The markdown content to render.

## Adding a New Block Type (Extension Checklist)

Creating a new layout block type must strictly follow the block-authoring checklist to ensure safety, contract stability, and parity with Python mirror systems.

1. **Zod Schema Member**: Define a new strictly typed Zod object for the block in `src/content/schema.ts` and add it to the `LayoutSchema` discriminated union.
2. **New Reviewed Component**: Build the React component in `src/blocks/<BlockName>.tsx` to render the defined props.
3. **Barrel Export**: Export the new component from `src/blocks/index.ts`.
4. **Registry Entry**: Map the literal `type` identifier to the new component in the runtime whitelist (`src/render/registry.ts`).
5. **Tests**: Add unit/render tests ensuring the block mounts and rejects invalid schemas.
6. **Python Mirror Sync**: Ensure parity with the server-side Python mirror (`Weltel-Mcp-Full/utils/ui_layout_schema.py`). Any structural schema change must:
   - Either update both the frontend and backend files together and update `design/mirror-manifest.json`, OR
   - Flag the pending sync using a markdown file: `design/pending-mirror/<yyyy-mm-dd>-<type>.md`.
7. **CLAUDE.md Update**: Document the new block type (if necessary) to assist agents during generation.
