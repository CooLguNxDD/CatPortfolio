/**
 * Asynchronous GLTF/GLB Model Loader with Caching & Skeleton Cloning
 * Loads and manages 153 stylized 3D fish creatures and seabed environment props.
 */

import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js"
import { FISH_CATALOG_METADATA, type ModelMetadata } from "./fishCatalogMetadata"

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
function fetchGltfTemplate(relPath: string): Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[] }> {
  let cachedPromise = gltfCache.get(relPath)
  if (!cachedPromise) {
    const fullUrl = `${getBaseUrl()}${relPath}`
    cachedPromise = new Promise((resolve, reject) => {
      gltfLoader.load(
        fullUrl,
        (gltf) => {
          resolve({
            scene: gltf.scene,
            animations: (gltf.animations as THREE.AnimationClip[]) || [],
          })
        },
        undefined,
        (err) => {
          console.warn(`[ModelLoader] Failed to load ${fullUrl}:`, err)
          reject(err)
        },
      )
    })
    gltfCache.set(relPath, cachedPromise)
  }
  return cachedPromise
}

/**
 * Maps a domain ID (ai, devops, mobile, platform) or custom species slug to a concrete model ID.
 */
export function resolveModelId(speciesOrDomain: string): string {
  const norm = speciesOrDomain.toLowerCase().replace(/[-_\s]/g, "")

  // 1. Portfolio Domain Mappings
  if (norm === "ai" || norm === "agent" || norm === "agents") return "MantaRay"
  if (norm === "devops" || norm === "infra" || norm === "cloud") return "GreateWhiteShark"
  if (norm === "mobile" || norm === "app" || norm === "ios" || norm === "android") return "Clownfish"
  if (norm === "platform" || norm === "backend" || norm === "systems") return "GreenTurtle"

  // 2. Direct lookup across all catalog groups
  for (const group of Object.values(FISH_CATALOG_METADATA)) {
    for (const model of group.models) {
      const mNorm = model.id.toLowerCase().replace(/[-_\s]/g, "")
      const nameNorm = (model.displayName || model.display_name || "").toLowerCase().replace(/[-_\s]/g, "")
      if (norm === mNorm || norm === nameNorm) {
        return model.id
      }
    }
  }

  // 3. Fallback defaults
  if (norm.includes("shark")) return "AngelShark"
  if (norm.includes("ray")) return "SpottedEagleRay"
  if (norm.includes("seahorse")) return "ZebraSeahorse"
  if (norm.includes("turtle")) return "HawksbillTurtle"
  if (norm.includes("dolphin")) return "PinkDolphin"
  if (norm.includes("lobster")) return "BlueLobster"
  if (norm.includes("angelfish") || norm.includes("angel")) return "QueenAngelfish"
  if (norm.includes("butterfly")) return "CopperbandButterflyfish"
  if (norm.includes("tang")) return "YellowTang"
  if (norm.includes("clown")) return "TomatoClownfish"

  return "AchilesTang"
}

/**
 * Loads a rigged fish creature instance with skeletal animations and shared palette.
 */
export async function loadFishModelInstance(
  modelId: string,
  options: {
    tintColor?: THREE.Color
    emissiveGlow?: number
  } = {},
): Promise<LoadedFishInstance> {
  const concreteId = resolveModelId(modelId)
  const relPath = `models/fish/${concreteId}.glb`

  const [template, paletteTex] = await Promise.all([
    fetchGltfTemplate(relPath),
    loadSharedPaletteTexture(),
  ])

  // Clone hierarchy safely with bone bindings
  const clone = SkeletonUtils.clone(template.scene) as THREE.Group
  const materials: THREE.MeshStandardMaterial[] = []

  clone.traverse((child) => {
    if ((child as THREE.Mesh).isMesh || (child as THREE.SkinnedMesh).isSkinnedMesh) {
      const mesh = child as THREE.Mesh | THREE.SkinnedMesh
      mesh.castShadow = true
      mesh.receiveShadow = true

      const mat = new THREE.MeshStandardMaterial({
        map: paletteTex,
        roughness: 0.55,
        metalness: 0.08,
        flatShading: true,
      })

      // Preserve full RGB color texture from Color.png atlas
      mat.color.set(0xffffff)

      // Apply subtle domain-tinted emissive glow for underwater visibility
      if (options.tintColor) {
        mat.emissive.set(options.tintColor)
        mat.emissiveIntensity = 0.15 + (options.emissiveGlow ?? 0.3) * 0.25
      }

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

  // Find metadata if available
  let metadata: ModelMetadata | undefined
  for (const group of Object.values(FISH_CATALOG_METADATA)) {
    const found = group.models.find((m) => m.id === concreteId)
    if (found) {
      metadata = found
      break
    }
  }

  return {
    group: clone,
    mixer,
    action,
    materials,
    metadata,
    isGltf: true,
  }
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
  const relPath = `models/props/${propId}.glb`

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
        roughness: 0.8,
        metalness: 0.05,
        flatShading: true,
      })

      // Preserve authentic coral/rock texture colors
      mat.color.set(0xffffff)

      if (options.tintColor) {
        mat.emissive.set(options.tintColor)
        mat.emissiveIntensity = 0.12
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
