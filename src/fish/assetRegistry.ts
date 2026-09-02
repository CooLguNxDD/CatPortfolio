/**
 * 3D asset registry — identity, path, and aliases for LayerLab GLBs.
 *
 * Source of truth: `public/models/fish-manifest.json` (written by
 * `npm run convert:fish`, also copied to `src/fish/generated/` so Vite
 * bundles it as JS — importing JSON from `public/` is served as
 * `application/json` and fails as a module script).
 *
 * Three.js stays in `modelLoader.ts`. This file is Zod + a map.
 */

import { z } from "zod"
import bundledManifest from "./generated/fish-manifest.json" with { type: "json" }

export const AssetKindSchema = z.enum(["creature", "prop"])
export type AssetKind = z.infer<typeof AssetKindSchema>

export const ManifestEntrySchema = z.object({
  id: z.string().min(1),
  path: z
    .string()
    .regex(/^models\/(fish|props)\/[\w.-]+\.glb$/, "path must be models/fish|props/<id>.glb"),
  type: AssetKindSchema,
  rig: z.string().min(1),
  vertices: z.number().int().nonnegative(),
  triangles: z.number().int().nonnegative(),
  bones: z.number().int().nonnegative(),
  sizeBytes: z.number().int().nonnegative(),
})

export type ManifestEntry = z.infer<typeof ManifestEntrySchema>

export const AssetManifestSchema = z.record(z.string(), ManifestEntrySchema)

/** Portfolio DomainId (and common synonyms) → flagship creature id. */
export const DOMAIN_ASSET_ALIASES: Readonly<Record<string, string>> = {
  ai: "MantaRay",
  agent: "MantaRay",
  agents: "MantaRay",
  devops: "GreateWhiteShark",
  infra: "GreateWhiteShark",
  cloud: "GreateWhiteShark",
  mobile: "Clownfish",
  app: "Clownfish",
  ios: "Clownfish",
  android: "Clownfish",
  platform: "GreenTurtle",
  backend: "GreenTurtle",
  systems: "GreenTurtle",
}

const HEURISTIC_FALLBACKS: ReadonlyArray<readonly [string, string]> = [
  ["shark", "AngelShark"],
  ["ray", "SpottedEagleRay"],
  ["seahorse", "ZebraSeahorse"],
  ["turtle", "HawksbillTurtle"],
  ["dolphin", "PinkDolphin"],
  ["dophin", "PinkDolphin"],
  ["lobster", "BlueLobster"],
  ["angelfish", "QueenAngelfish"],
  ["angel", "QueenAngelfish"],
  ["butterfly", "CopperbandButterflyfish"],
  ["tang", "YellowTang"],
  ["clown", "TomatoClownfish"],
]

const DEFAULT_CREATURE_ID = "AchilesTang"

export function normalizeAssetKey(value: string): string {
  return value.toLowerCase().replace(/[-_\s]/g, "")
}

/** PascalCase / camelCase id → kebab-case alias (`MantaRay` → `manta-ray`). */
export function kebabAssetId(id: string): string {
  return id
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase()
}

export interface RegisteredAsset extends ManifestEntry {
  aliases: string[]
}

export interface AssetListFilter {
  type?: AssetKind
  rig?: string
}

function getBaseUrl(): string {
  if (typeof import.meta !== "undefined" && import.meta.env?.BASE_URL) {
    const base = import.meta.env.BASE_URL
    return base.endsWith("/") ? base : `${base}/`
  }
  return "/"
}

export function defaultManifestUrl(): string {
  return `${getBaseUrl()}models/fish-manifest.json`
}

export function parseManifestEntries(data: unknown): ManifestEntry[] {
  const whole = AssetManifestSchema.safeParse(data)
  if (whole.success) return Object.values(whole.data)
  if (!data || typeof data !== "object") return []
  const out: ManifestEntry[] = []
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const parsed = ManifestEntrySchema.safeParse(value)
    if (parsed.success) {
      out.push({ ...parsed.data, id: parsed.data.id || key })
    }
  }
  return out
}

export class AssetRegistry {
  private readonly byId = new Map<string, RegisteredAsset>()
  private readonly byAlias = new Map<string, string>()
  private manifestPromise: Promise<void> | null = null

  constructor(options: { manifest?: unknown } = {}) {
    this.installDomainAliases()
    if (options.manifest !== undefined) this.registerManifest(options.manifest)
  }

  /** Register every row from a convert:fish manifest (idempotent merge). */
  registerAll(data: unknown = bundledManifest): number {
    return this.registerManifest(data)
  }

  /** Register (or replace) one manifest row and its kebab/compact aliases. */
  register(entry: ManifestEntry): RegisteredAsset {
    const aliases = this.aliasesFor(entry.id)
    const asset: RegisteredAsset = { ...entry, aliases }
    this.byId.set(entry.id, asset)
    this.byAlias.set(normalizeAssetKey(entry.id), entry.id)
    for (const alias of aliases) {
      this.byAlias.set(normalizeAssetKey(alias), entry.id)
    }
    return asset
  }

  /** Point a lookup key at an already-known (or soon-to-be-known) id. */
  alias(alias: string, id: string): void {
    this.byAlias.set(normalizeAssetKey(alias), id)
  }

  /** Bulk-register a convert:fish manifest object. Invalid rows are skipped. */
  registerManifest(data: unknown): number {
    const entries = parseManifestEntries(data)
    for (const entry of entries) this.register(entry)
    return entries.length
  }

  /**
   * Fetch `public/models/fish-manifest.json` once and register every row.
   * Failures are non-fatal: loaders fall back to `models/{fish|props}/<id>.glb`.
   */
  loadManifest(url: string = defaultManifestUrl()): Promise<void> {
    if (!this.manifestPromise) {
      this.manifestPromise = fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error(`manifest ${res.status} ${url}`)
          return res.json() as Promise<unknown>
        })
        .then((json) => {
          this.registerManifest(json)
        })
        .catch((err) => {
          this.manifestPromise = null
          console.warn("[AssetRegistry] failed to load manifest:", err)
        })
    }
    return this.manifestPromise
  }

  /** Idempotent: in-flight fetch is shared; already-hydrated is a no-op wait. */
  ensureManifest(): Promise<void> {
    if (this.size > 0) return Promise.resolve()
    return this.loadManifest()
  }

  get(idOrAlias: string): RegisteredAsset | undefined {
    const id = this.resolve(idOrAlias)
    return this.byId.get(id)
  }

  has(idOrAlias: string): boolean {
    return this.get(idOrAlias) !== undefined
  }

  /**
   * Canonical catalog id for a domain, slug, or PascalCase name.
   * Always returns a string (falls back to AchilesTang).
   */
  resolve(idOrAlias: string): string {
    const raw = idOrAlias.trim()
    if (!raw) return DEFAULT_CREATURE_ID
    if (this.byId.has(raw)) return raw

    const norm = normalizeAssetKey(raw)
    const aliased = this.byAlias.get(norm)
    if (aliased) return aliased

    for (const id of this.byId.keys()) {
      if (normalizeAssetKey(id) === norm) return id
    }

    for (const [needle, fallback] of HEURISTIC_FALLBACKS) {
      if (norm.includes(needle)) return fallback
    }

    return DEFAULT_CREATURE_ID
  }

  /**
   * Relative path from the manifest, or a constructed fallback when the
   * catalog has not been fetched yet.
   */
  pathFor(idOrAlias: string, kind: AssetKind = "creature"): string {
    const asset = this.get(idOrAlias)
    if (asset) return asset.path
    const key = normalizeAssetKey(idOrAlias)
    const known = this.byAlias.has(key) || this.byId.has(idOrAlias.trim())
    const id = known ? this.resolve(idOrAlias) : idOrAlias.trim()
    const folder = kind === "prop" ? "props" : "fish"
    return `models/${folder}/${id}.glb`
  }

  urlFor(idOrAlias: string, kind: AssetKind = "creature"): string {
    return `${getBaseUrl()}${this.pathFor(idOrAlias, kind)}`
  }

  list(filter: AssetListFilter = {}): RegisteredAsset[] {
    const out: RegisteredAsset[] = []
    for (const asset of this.byId.values()) {
      if (filter.type && asset.type !== filter.type) continue
      if (filter.rig && asset.rig !== filter.rig) continue
      out.push(asset)
    }
    return out
  }

  get size(): number {
    return this.byId.size
  }

  /** Test-only: drop catalog rows; domain aliases stay. */
  reset(): void {
    this.byId.clear()
    this.byAlias.clear()
    this.manifestPromise = null
    this.installDomainAliases()
  }

  private installDomainAliases(): void {
    for (const [alias, id] of Object.entries(DOMAIN_ASSET_ALIASES)) {
      this.alias(alias, id)
      this.alias(kebabAssetId(id), id)
      this.alias(id, id)
    }
  }

  private aliasesFor(id: string): string[] {
    return [...new Set([id, kebabAssetId(id), normalizeAssetKey(id)])]
  }
}

/** Process-wide registry — every LayerLab fish + prop is registered on import. */
export const assetRegistry = new AssetRegistry({ manifest: bundledManifest })

/** Register (or re-register) the bundled convert:fish catalog on the singleton. */
export function registerAllFish(): number {
  return assetRegistry.registerAll()
}

export function registerAsset(entry: ManifestEntry): RegisteredAsset {
  return assetRegistry.register(entry)
}

export function registerAssetAlias(alias: string, id: string): void {
  assetRegistry.alias(alias, id)
}

export function registerManifest(data: unknown): number {
  return assetRegistry.registerManifest(data)
}

export function ensureAssetManifest(): Promise<void> {
  return assetRegistry.ensureManifest()
}
