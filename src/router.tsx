/**
 * TanStack Router tree. `/` is the only page; `/ask` redirects here so
 * old links keep working. Optional `?j=<short_id>` keeps the demo bake in
 * the URL (react-app-guide: params as shareable route state).
 */

import { createRootRoute, createRoute, createRouter, redirect } from "@tanstack/react-router"
import { z } from "zod"
import App from "./App"
import { HomePage } from "./routes/HomePage"

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
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/", search, replace: true })
  },
  component: () => null,
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
