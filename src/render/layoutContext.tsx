import { createContext, useContext } from "react"
import type { Layout } from "@/content/schema"

/** Layout currently being rendered — project grids look up fish dates from it. */
export const LayoutRenderContext = createContext<Layout | null>(null)

/** The layout passed into the active LayoutRenderer, or null outside it. */
export function useRenderedLayout(): Layout | null {
  return useContext(LayoutRenderContext)
}
