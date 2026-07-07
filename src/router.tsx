import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router"
import App from "./App"
import { HomePage } from "./routes/HomePage"
import { AskPage } from "./routes/AskPage"

const rootRoute = createRootRoute({
  component: App,
})

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
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
