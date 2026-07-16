import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router"
import { z } from "zod"
import App from "./App"
import { HomePage } from "./routes/HomePage"
import { AskPage } from "./routes/AskPage"

const rootRoute = createRootRoute({
  component: App,
})

const homeSearchSchema = z.object({
  // Job-specific baked portfolio layout ("bake & send") — e.g. ?j=weltel_successor_992
  j: z.string().optional(),
})

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  validateSearch: homeSearchSchema,
  component: HomePage,
})

const askRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/ask",
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
