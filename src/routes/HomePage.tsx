import { useQuery } from "@tanstack/react-query"
import { useSearch } from "@tanstack/react-router"
import { loadBaked, loadJobLayout } from "@/content/loadLayout"
import { LayoutRenderer } from "@/render/LayoutRenderer"

const bakedLayout = loadBaked()

export function HomePage() {
  const { j } = useSearch({ from: "/" })

  const { data } = useQuery({
    queryKey: ["job-layout", j],
    queryFn: () => loadJobLayout(j!),
    enabled: !!j,
    retry: false,
    staleTime: 60_000,
    placeholderData: { layout: bakedLayout, source: "snapshot" as const },
  })

  const layout = j ? (data?.layout ?? bakedLayout) : bakedLayout

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 space-y-10">
      <LayoutRenderer layout={layout} />
    </div>
  )
}
