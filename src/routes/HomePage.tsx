import { loadBaked } from "@/content/loadLayout"
import { LayoutRenderer } from "@/render/LayoutRenderer"

const layout = loadBaked()

export function HomePage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 space-y-10">
      <LayoutRenderer layout={layout} />
    </div>
  )
}
