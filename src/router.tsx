/**
 * TanStack Router tree. `/` is the portfolio; `/pipeline` is a lazy walkthrough; `/ask` redirects home so
 * old links keep working. Optional `?j=<short_id>` keeps the demo bake in
 * the URL (react-app-guide: params as shareable route state).
 */

import { createRootRoute, createRoute, createRouter, redirect, lazyRouteComponent } from "@tanstack/react-router"
import { z } from "zod"
import App from "./App"
import { HomePage } from "./routes/HomePage"

const rootRoute = createRootRoute({
  component: App,
})

/**
 * Shared search: job-layout short id, view mode (tank default), focused fish,
 * one-shot matrix scroll target (cleared after the block is in view).
 * Absent `v` resolves to tank when capable (see resolveViewMode).
 */
export const demoSearchSchema = z.object({
  j: z.string().optional().catch(undefined),
  v: z.enum(["text", "tank"]).optional().catch(undefined),
  f: z.string().optional().catch(undefined),
  scrollTo: z.string().optional().catch(undefined),
})

export type DemoSearch = z.infer<typeof demoSearchSchema>

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  validateSearch: demoSearchSchema,
  component: HomePage,
})

const askRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/ask",
  validateSearch: demoSearchSchema,
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/", search, replace: true })
  },
  component: () => null,
})

const pipelineRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/pipeline",
  validateSearch: demoSearchSchema,
  component: lazyRouteComponent(() => import("@/routes/PipelinePage"), "PipelinePage"),
})

/** Portfolio, lazy walkthrough and legacy redirect share the deployment basepath. */
export const router = createRouter({
  routeTree: rootRoute.addChildren([homeRoute, askRoute, pipelineRoute]),
  basepath: import.meta.env.BASE_URL,
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
