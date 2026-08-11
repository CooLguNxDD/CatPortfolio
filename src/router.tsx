/**
 * TanStack Router tree. Both Home and Ask accept optional `?j=<short_id>` so
 * the demo bake stays in the URL when navigating (react-app-guide: params as
 * shareable route state).
 */

import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router"
import { z } from "zod"
import App from "./App"
import { HomePage } from "./routes/HomePage"
import { AskPage } from "./routes/AskPage"

const rootRoute = createRootRoute({
  component: App,
})

/**
 * Shared search: job-layout short id, view mode (tank default), focused fish.
 * Absent `v` resolves to tank when capable (see resolveViewMode).
 */
export const demoSearchSchema = z.object({
  j: z.string().optional(),
  v: z.enum(["text", "tank"]).optional(),
  f: z.string().optional(),
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
  component: AskPage,
})

export const router = createRouter({
  routeTree: rootRoute.addChildren([homeRoute, askRoute]),
  basepath: import.meta.env.BASE_URL,
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
