import baked from "./layout.json";
import { LayoutSchema, type Layout } from "./schema";

export function loadBaked(): Layout {
  return LayoutSchema.parse(baked);
}

export type LayoutSource = "live" | "snapshot";

export async function loadLiveWithStatus(audience: string):
    Promise<{ layout: Layout; source: LayoutSource }> {
  const base = import.meta.env.VITE_OCT_URL as string | undefined;
  if (!base) return { layout: loadBaked(), source: "snapshot" };
  try {
    const res = await fetch(`${base}/portfolio/layout?audience=${audience}`,
      { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(String(res.status));
    return { layout: LayoutSchema.parse(await res.json()), source: "live" };
  } catch {
    return { layout: loadBaked(), source: "snapshot" };
  }
}

export async function loadLive(audience: string): Promise<Layout> {
  return (await loadLiveWithStatus(audience)).layout;
}
