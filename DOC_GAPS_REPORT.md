# Documentation Gaps Report

| File | Entity | Suggested Docstring / Comment |
|---|---|---|
| `scripts/sources-schema.ts` | `SourcesSchema` | `/** Zod schema defining the structure and validation for SourcesSchema. */` |
| `src/api/harness.ts` | `extractMarkdown` | `/** Extracts and formats markdown content from an OCT tool result. */` |
| `src/api/harness.ts` | `askOct` | `/** Sends a user query to the OCT server and returns the parsed result. */` |
| `src/api/instructions.ts` | `wrapMessage` | `/** Wraps a user message with the required chat instructions for the OCT context. */` |
| `src/api/octClient.ts` | `OctClient` | `/** Client class for interacting with the OpenCat Tunnel (OCT) MCP server. */` |
| `src/api/octClient.ts` | `octBaseUrl` | `/** Retrieves the base URL for the OCT server from environment variables. */` |
| `src/api/octClient.ts` | `getSharedClient` | `/** Retrieves or initializes the shared OctClient instance. */` |
| `src/api/octClient.ts` | `resetSharedClient` | `/** Closes and removes the shared OctClient instance. */` |
| `src/App.tsx` | `App` | `/** The root application layout component. */` |
| `src/blocks/ArchDiagram.tsx` | `ArchDiagram` | `/** Renders a ArchDiagram block component for the portfolio layout. */` |
| `src/blocks/CodeSnippet.tsx` | `CodeSnippet` | `/** Renders a CodeSnippet block component for the portfolio layout. */` |
| `src/blocks/Hero.tsx` | `Hero` | `/** Renders a Hero block component for the portfolio layout. */` |
| `src/blocks/MermaidDiagram.tsx` | `MermaidDiagram` | `/** Renders a MermaidDiagram block component for the portfolio layout. */` |
| `src/blocks/ProjectGrid.tsx` | `ProjectGrid` | `/** Renders a ProjectGrid block component for the portfolio layout. */` |
| `src/blocks/Prose.tsx` | `Prose` | `/** Renders a Prose block component for the portfolio layout. */` |
| `src/blocks/StarStory.tsx` | `StarStory` | `/** Renders a StarStory block component for the portfolio layout. */` |
| `src/blocks/StatStrip.tsx` | `StatStrip` | `/** Renders a StatStrip block component for the portfolio layout. */` |
| `src/components/chat/ChatMessage.tsx` | `ChatMessage` | `/** Renders the individual chat message. */` |
| `src/components/chat/ChatPanel.tsx` | `ChatPanel` | `/** Renders the chat interface panel. */` |
| `src/components/ui/button.tsx` | `Button` | `/** Renders the Button UI component. */` |
| `src/components/ui/card.tsx` | `Card` | `/** Renders the Card UI component. */` |
| `src/components/ui/card.tsx` | `CardHeader` | `/** Renders the CardHeader UI component. */` |
| `src/components/ui/card.tsx` | `CardTitle` | `/** Renders the CardTitle UI component. */` |
| `src/components/ui/card.tsx` | `CardDescription` | `/** Renders the CardDescription UI component. */` |
| `src/components/ui/card.tsx` | `CardContent` | `/** Renders the CardContent UI component. */` |
| `src/components/ui/card.tsx` | `CardFooter` | `/** Renders the CardFooter UI component. */` |
| `src/content/loadLayout.ts` | `loadBaked` | `/** Loads the static, pre-compiled layout from the local JSON file. */` |
| `src/content/loadLayout.ts` | `loadLiveWithStatus` | `/** Attempts to load the live layout from the OCT server, falling back to the snapshot on failure. */` |
| `src/content/loadLayout.ts` | `loadLive` | `/** Loads the live layout from the OCT server. */` |
| `src/content/schema.ts` | `LayoutSchema` | `/** Zod schema defining the structure and validation for LayoutSchema. */` |
| `src/lib/utils.ts` | `cn` | `/** Utility function for merging Tailwind CSS classes using clsx and tailwind-merge. */` |
| `src/render/LayoutRenderer.tsx` | `LayoutRenderer` | `/** Renders a list of layout blocks sequentially with staggered entrance animations. */` |
| `src/router.tsx` | `router` | `/** The main TanStack Router instance for the application. */` |
| `src/routes/AskPage.tsx` | `AskPage` | `/** Renders the Ask page route. */` |
| `src/routes/HomePage.tsx` | `HomePage` | `/** Renders the Home page route. */` |
| `src/themes/theme-context.ts` | `ThemeContext` | `/** React context for providing access to the theme registry. */` |
