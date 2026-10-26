/**
 * Runtime profile pieces — drop-in JSON files merged into the resolved
 * layout without a rebuild.
 *
 * `${BASE_URL}profile-pieces/index.json` lists piece files; each piece adds
 * fish to the `fishTank` block and (optionally) rows to the first `timeline`
 * block. Everything fails soft: a missing index or a bad piece is a
 * console.warn and the layout stays as it was.
 */

import { z } from "zod"
import { FishSpecimen, TimelineItem, type Layout } from "./schema"

/** Same cap as the FishTank schema (`fish.max(40)`). */
export const MAX_FISH = 40

export const ProfilePieceSchema = z.object({
  version: z.literal(1),
  id: z.string().min(1),
  title: z.string().min(1),
  fish: z.array(FishSpecimen).min(1).max(MAX_FISH),
  timeline: z.array(TimelineItem).optional(),
})
export type ProfilePiece = z.infer<typeof ProfilePieceSchema>

/** Plain file names only — no paths, no traversal, `.json` suffix. */
const PIECE_FILE = /^[A-Za-z0-9][A-Za-z0-9._-]*\.json$/

export const ProfilePieceIndexSchema = z.object({
  pieces: z.array(z.string().regex(PIECE_FILE)).default([]),
})

const FETCH_TIMEOUT_MS = 5_000

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  // SPA fallbacks answer a missing file with index.html (200) — json() throws.
  return res.json()
}

/**
 * Fetch and validate every piece listed in the index. Never throws:
 * a missing index yields `[]`, a bad piece is skipped with a warning.
 */
export async function loadProfilePieces(
  baseUrl: string = import.meta.env.BASE_URL,
): Promise<ProfilePiece[]> {
  const dir = `${baseUrl.replace(/\/?$/, "/")}profile-pieces/`
  let files: string[]
  try {
    const parsed = ProfilePieceIndexSchema.safeParse(await fetchJson(`${dir}index.json`))
    if (!parsed.success) {
      console.warn("profilePieces: invalid index.json", parsed.error.issues)
      return []
    }
    files = parsed.data.pieces
  } catch (err) {
    console.warn("profilePieces: no index.json, skipping", err)
    return []
  }

  const results = await Promise.all(
    files.map(async (file): Promise<ProfilePiece | null> => {
      try {
        const parsed = ProfilePieceSchema.safeParse(await fetchJson(`${dir}${file}`))
        if (parsed.success) return parsed.data
        console.warn(`profilePieces: invalid piece ${file}`, parsed.error.issues)
      } catch (err) {
        console.warn(`profilePieces: could not load ${file}`, err)
      }
      return null
    }),
  )
  return results.filter((p): p is ProfilePiece => p !== null)
}

/**
 * Merge pieces into a layout (pure). Piece fish replace same-slug fish,
 * new fish append until the 40 cap; timeline rows are prepended to the
 * first timeline block (pieces are usually the newest work). Returns the
 * input reference unchanged when there is nothing to merge.
 */
export function mergeProfilePieces(layout: Layout, pieces: ProfilePiece[]): Layout {
  if (pieces.length === 0) return layout

  const pieceFish = new Map<string, ProfilePiece["fish"][number]>()
  for (const piece of pieces) for (const f of piece.fish) pieceFish.set(f.slug, f)
  const pieceRows = pieces.flatMap((p) => p.timeline ?? [])

  let fishMerged = false
  let timelineSeen = false
  let timelineMerged = false
  const blocks = layout.blocks.map((block) => {
    if (block.type === "fishTank" && !fishMerged && pieceFish.size > 0) {
      fishMerged = true
      const pending = new Map(pieceFish)
      const fish = block.props.fish.map((f) => {
        const replacement = pending.get(f.slug)
        if (!replacement) return f
        pending.delete(f.slug)
        return replacement
      })
      for (const f of pending.values()) {
        if (fish.length >= MAX_FISH) {
          console.warn(`profilePieces: tank full (${MAX_FISH}), dropping fish ${f.slug}`)
          continue
        }
        fish.push(f)
      }
      return { ...block, props: { ...block.props, fish, timeSpan: widenTimeSpan(block.props.timeSpan, fish) } }
    }
    if (block.type === "timeline" && !timelineSeen && pieceRows.length > 0) {
      timelineSeen = true
      // Idempotent: a layout that already carries the rows (re-merged
      // working copy) is left alone.
      const seen = new Set(block.props.items.map(rowKey))
      const fresh = pieceRows.filter((row) => !seen.has(rowKey(row)))
      if (fresh.length === 0) return block
      timelineMerged = true
      return { ...block, props: { ...block.props, items: [...fresh, ...block.props.items] } }
    }
    return block
  })

  return fishMerged || timelineMerged ? { ...layout, blocks } : layout
}

function rowKey(row: { date: string; title: string }): string {
  return `${row.date}\u0000${row.title}`
}

/** Keep an authored timeSpan covering piece years (depth bands read it). */
function widenTimeSpan(
  span: { min: number; max: number } | undefined,
  fish: Array<{ startYear?: number; endYear?: number }>,
): { min: number; max: number } | undefined {
  if (!span) return span
  let { min, max } = span
  for (const f of fish) {
    for (const y of [f.startYear, f.endYear]) {
      if (y == null) continue
      if (y < min) min = y
      if (y > max) max = y
    }
  }
  return min === span.min && max === span.max ? span : { min, max }
}
