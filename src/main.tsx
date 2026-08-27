import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "@tanstack/react-router"
import { ThemeProvider } from "./components/ThemeProvider"
import { router } from "./router"
import { loadRuntimeConfig } from "./config/runtimeConfig"
import { stampAtsMeta } from "./lib/atsMeta"
import "./index.css"

const queryClient = new QueryClient()

// Gate the first render on runtime config so no OCT call (octClient, harness,
// loadJobLayout) can fire before the backend base URL is resolved.
loadRuntimeConfig().finally(() => {
  stampAtsMeta()
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </ThemeProvider>
    </StrictMode>,
  )
})
