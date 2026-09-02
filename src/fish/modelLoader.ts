/**
 * Asynchronous GLTF/GLB Model Loader with Caching & Skeleton Cloning
 * Loads and manages 153 stylized 3D fish creatures and seabed environment props.
 */

import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js"
import { FISH_CATALOG_METADATA, type ModelMetadata } from "./fishCatalogMetadata"
import { applyRigFacing, isCreatureRig, type CreatureRig } from "./gltfFacing"
import { assetRegistry, ensureAssetManifest } from "./assetRegistry"
import { FISH_GLTF_CONFIG } from "@/blocks/fishTankConfig"

export interface LoadedFishInstance {
  group: THREE.Group
  mixer?: THREE.AnimationMixer
  action?: THREE.AnimationAction
  materials: THREE.MeshStandardMaterial[]
  metadata?: ModelMetadata
  isGltf: true
}

export interface LoadedPropInstance {
  group: THREE.Group
  materials: THREE.MeshStandardMaterial[]
  isGltf: true
}

const gltfLoader = new GLTFLoader()
const textureLoader = new THREE.TextureLoader()

// Template cache for parsed GLTFs
const gltfCache = new Map<string, Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[] }>>()

// Shared palette texture cache
let paletteTexturePromise: Promise<THREE.Texture> | null = null

function getBaseUrl(): string {
  if (typeof import.meta !== "undefined" && import.meta.env?.BASE_URL) {
    const base = import.meta.env.BASE_URL
    return base.endsWith("/") ? base : `${base}/`
  }
  return "/"
}

/**
 * Loads and caches the shared 64x64 color palette atlas.
 */
export function loadSharedPaletteTexture(): Promise<THREE.Texture> {
  if (!paletteTexturePromise) {
    const texPath = `${getBaseUrl()}models/textures/color.png`
    paletteTexturePromise = new Promise((resolve) => {
      textureLoader.load(
        texPath,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace
          tex.magFilter = THREE.NearestFilter
          tex.minFilter = THREE.NearestFilter
          tex.flipY = false
          resolve(tex)
        },
        undefined,
        () => {
          // Fallback dummy 1x1 white texture on load error
          const canvas = document.createElement("canvas")
          canvas.width = canvas.height = 1
          const ctx = canvas.getContext("2d")
          if (ctx) {
            ctx.fillStyle = "#ffffff"
            ctx.fillRect(0, 0, 1, 1)
          }
          const fallback = new THREE.CanvasTexture(canvas)
          resolve(fallback)
        },
      )
    })
  }
  return paletteTexturePromise
}

/**
 * Parses or fetches a GLTF asset template from public/models/
 */
function loadGltfOnce(fullUrl: string): Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[] }> {
  return new Promise((resolve, reject) => {
    gltfLoader.load(
      fullUrl,
      (gltf) => {
        resolve({
          scene: gltf.scene,
          animations: (gltf.animations as THREE.AnimationClip[]) || [],
        })
      },
      undefined,
      (err) => reject(err),
    )
  })
}

function fetchGltfTemplate(relPath: string): Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[] }> {
  let cachedPromise = gltfCache.get(relPath)
  if (!cachedPromise) {
    const fullUrl = `${getBaseUrl()}${relPath}`
    cachedPromise = loadGltfOnce(fullUrl).catch(async (err) => {
      // Vite's SPA fallback can win a race on the first .glb request and
      // return index.html. Do not cache that failure — retry once.
      console.warn(`[ModelLoader] Failed to load ${fullUrl}, retrying:`, err)
      await new Promise((r) => setTimeout(r, 120))
      return loadGltfOnce(fullUrl)
    }).catch((err) => {
      gltfCache.delete(relPath)
      console.warn(`[ModelLoader] Failed to load ${fullUrl}:`, err)
      throw err
    })
    gltfCache.set(relPath, cachedPromise)
  }
  return cachedPromise
}

/**
 * Maps a domain ID (ai, devops, mobile, platform) or custom species slug to a concrete model ID.
 * Prefers the manifest-backed `assetRegistry`; catalog metadata fills display-name gaps.
 */
export function resolveModelId(speciesOrDomain: string): string {
  const fromRegistry = assetRegistry.resolve(speciesOrDomain)
  // Domain aliases + heuristics resolve before the manifest fetch.
  if (fromRegistry !== "AchilesTang") return fromRegistry

  const norm = speciesOrDomain.toLowerCase().replace(/[-_\s]/g, "")
  for (const group of Object.values(FISH_CATALOG_METADATA)) {
    for (const model of group.models) {
      const mNorm = model.id.toLowerCase().replace(/[-_\s]/g, "")
      const nameNorm = (model.displayName || model.display_name || "").toLowerCase().replace(/[-_\s]/g, "")
      if (norm === mNorm || norm === nameNorm) {
        return model.id
      }
    }
  }

  return fromRegistry
}

/**
 * Loads a rigged fish creature instance with skeletal animations and shared palette.
 */
export async function loadFishModelInstance(
  modelId: string,
  options: {
    emissiveGlow?: number
  } = {},
): Promise<LoadedFishInstance> {
  await ensureAssetManifest()
  const concreteId = resolveModelId(modelId)
  const relPath = assetRegistry.pathFor(concreteId, "creature")

  const [template, paletteTex] = await Promise.all([
    fetchGltfTemplate(relPath),
    loadSharedPaletteTexture(),
  ])

  // Clone hierarchy safely with bone bindings
  const clone = SkeletonUtils.clone(template.scene) as THREE.Group
  const materials: THREE.MeshStandardMaterial[] = []
  const glow = options.emissiveGlow ?? 0

  clone.traverse((child) => {
    if ((child as THREE.Mesh).isMesh || (child as THREE.SkinnedMesh).isSkinnedMesh) {
      const mesh = child as THREE.Mesh | THREE.SkinnedMesh
      mesh.castShadow = true
      mesh.receiveShadow = true

      const mat = new THREE.MeshStandardMaterial({
        // Albedo is the LayerLab atlas — the default fish texture. Emissive
        // stays white: a hue-neutral bloom lift over that atlas, never a
        // domain tint (domain identity lives in the species/model, not a
        // color written onto or around it).
        map: paletteTex,
        color: 0xffffff,
        emissiveMap: paletteTex,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: FISH_GLTF_CONFIG.emissiveFloor + glow * FISH_GLTF_CONFIG.emissiveGlowMul,
        roughness: FISH_GLTF_CONFIG.roughness,
        metalness: FISH_GLTF_CONFIG.metalness,
        flatShading: true,
        transparent: false,
        opacity: 1,
      })

      mesh.material = mat
      materials.push(mat)
    }
  })

  // Normalize scale so models fit 2x larger standard range (~2.4 units)
  const box = new THREE.Box3().setFromObject(clone)
  const size = box.getSize(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y, size.z)
  if (maxDim > 0) {
    const targetScale = 2.4 / maxDim
    clone.scale.multiplyScalar(targetScale)
  }

  // Animation mixer setup
  let mixer: THREE.AnimationMixer | undefined
  let action: THREE.AnimationAction | undefined

  if (template.animations && template.animations.length > 0) {
    mixer = new THREE.AnimationMixer(clone)
    action = mixer.clipAction(template.animations[0])
    action.setLoop(THREE.LoopRepeat, Infinity)
    action.play()
  }

  const metadata = findModelMetadata(concreteId)
  const rig = rigForModelId(concreteId)
  const facingRoot = new THREE.Group()
  facingRoot.name = "gltf_facing"
  facingRoot.add(clone)
  applyRigFacing(facingRoot, rig)

  return {
    group: facingRoot,
    mixer,
    action,
    materials,
    metadata,
    isGltf: true,
  }
}

function findModelMetadata(modelId: string): ModelMetadata | undefined {
  for (const group of Object.values(FISH_CATALOG_METADATA)) {
    const found = group.models.find((m) => m.id === modelId)
    if (found) return found
  }
  return undefined
}

export function rigForModelId(modelId: string): CreatureRig {
  const concreteId = resolveModelId(modelId)
  const registered = assetRegistry.get(concreteId)
  if (registered && isCreatureRig(registered.rig)) return registered.rig
  for (const group of Object.values(FISH_CATALOG_METADATA)) {
    if (group.models.some((m) => m.id === concreteId) && isCreatureRig(group.rig)) {
      return group.rig
    }
  }
  return "fish"
}

/**
 * Loads a static seabed prop instance (coral, rock, seaweed, shell).
 */
export async function loadPropModelInstance(
  propId: string,
  options: {
    tintColor?: THREE.Color
    scale?: number
  } = {},
): Promise<LoadedPropInstance> {
  await ensureAssetManifest()
  const relPath = assetRegistry.pathFor(propId, "prop")

  const [template, paletteTex] = await Promise.all([
    fetchGltfTemplate(relPath),
    loadSharedPaletteTexture(),
  ])

  const clone = template.scene.clone(true)
  const materials: THREE.MeshStandardMaterial[] = []

  clone.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh
      mesh.castShadow = true
      mesh.receiveShadow = true

      const mat = new THREE.MeshStandardMaterial({
        map: paletteTex,
        emissiveMap: paletteTex,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 0.35,
        roughness: 0.6,
        metalness: 0.05,
        flatShading: true,
        transparent: true,
        opacity: 1,
      })

      // Preserve authentic coral/rock texture colors
      mat.color.set(0xffffff)

      if (options.tintColor) {
        mat.emissive.set(options.tintColor)
        mat.emissiveIntensity = 0.25
      }

      mesh.material = mat
      materials.push(mat)
    }
  })

  if (options.scale) {
    clone.scale.multiplyScalar(options.scale)
  }

  return {
    group: clone,
    materials,
    isGltf: true,
  }
}

export interface ModelInfo {
  modelId: string
  displayName: string
  groupName: string
  family: string
  rig: string
  vertices: number
  triangles: number
  bones: number
}

/**
 * Returns complete catalog information for a given species or domain.
 */
export function getModelInfo(speciesOrDomain: string): ModelInfo | null {
  const modelId = resolveModelId(speciesOrDomain)
  for (const group of Object.values(FISH_CATALOG_METADATA)) {
    const model = group.models.find((m) => m.id === modelId)
    if (model) {
      return {
        modelId: model.id,
        displayName: model.displayName || model.display_name || model.id,
        groupName: group.name,
        family: group.family,
        rig: group.rig,
        vertices: model.vertices,
        triangles: model.triangles,
        bones: model.bones,
      }
    }
  }
  return null
}
