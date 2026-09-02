/**
 * Seabed 3D Flora, Reef & Environment Decorator
 * Loads and scatters real 3D corals, boulders, shells, and starfish from public/models/props/
 */

import * as THREE from "three"
import { loadPropModelInstance } from "./modelLoader"

export interface SeabedDecorConfig {
  tank: THREE.Group
  floorY: number
  halfWidth: number
  halfDepth: number
  palette: {
    accent: string | number
    neon: string | number
    cyan: string | number
    weed: string | number
  }
  signal?: AbortSignal
  onMaterial?: (mat: THREE.MeshStandardMaterial) => void
}

// Curated selection of 3D environmental props from the 55 available models
const CORAL_PROP_IDS = [
  "CoralAA",
  "CoralBA",
  "CoralCA",
  "CoralD",
  "CoralE",
  "CoralIA",
  "CoralJA",
  "CoralKA",
  "CoralLA",
  "CoralMA",
  "CoralNA",
  "CoralOA",
]

const ROCK_PROP_IDS = [
  "RockA",
  "RockB",
  "RockC",
  "RockF",
  "RockH",
  "RockJ",
]

const SEABED_DETAIL_IDS = [
  "StarfishA",
  "StarfishB",
  "ShellA",
  "ShellB",
  "ShellC",
]

const SEAWEED_PROP_IDS = ["SeaweedA", "SeaweedB", "SeaweedC", "SeaweedD"]

/**
 * Spawns an authentic 3D coral reef landscape on the aquarium seafloor.
 */
function attachProp(
  config: SeabedDecorConfig,
  decorGroup: THREE.Group,
  instance: { group: THREE.Group; materials: THREE.MeshStandardMaterial[] },
  place: (group: THREE.Group) => void,
) {
  if (config.signal?.aborted) return
  for (const mat of instance.materials) config.onMaterial?.(mat)
  place(instance.group)
  decorGroup.add(instance.group)
}

export async function populateSeabedDecor(config: SeabedDecorConfig): Promise<THREE.Group> {
  const decorGroup = new THREE.Group()
  decorGroup.name = "seabed_3d_decor"
  if (config.signal?.aborted) return decorGroup
  config.tank.add(decorGroup)

  const coralColors = [
    new THREE.Color(config.palette.accent),
    new THREE.Color(config.palette.neon),
    new THREE.Color(config.palette.cyan),
  ]

  // 1. Scatter Branching & Table Corals
  const coralCount = 12
  for (let i = 0; i < coralCount; i++) {
    const propId = CORAL_PROP_IDS[i % CORAL_PROP_IDS.length]!
    const col = coralColors[i % coralColors.length]!
    const scale = 0.035 + (i % 4) * 0.012

    loadPropModelInstance(propId, { tintColor: col, scale })
      .then((instance) => {
        attachProp(config, decorGroup, instance, (group) => {
          const xFrac = (i / (coralCount - 1) - 0.5) * 1.6
          const x = xFrac * config.halfWidth + (i % 2 === 0 ? 0.8 : -0.8)
          const z = ((i % 3) - 1) * (config.halfDepth * 0.55) + (i % 2 === 0 ? 0.5 : -0.5)
          group.position.set(x, config.floorY + 0.1, z)
          group.rotation.y = (i * Math.PI) / 3
        })
      })
      .catch(() => {})
  }

  // 2. Scatter Cavernous Reef Boulders
  const rockCount = 6
  for (let i = 0; i < rockCount; i++) {
    const propId = ROCK_PROP_IDS[i % ROCK_PROP_IDS.length]!
    const scale = 0.04 + (i % 3) * 0.015

    loadPropModelInstance(propId, { scale })
      .then((instance) => {
        attachProp(config, decorGroup, instance, (group) => {
          const x = ((i / (rockCount - 1) - 0.5) * 1.8) * config.halfWidth
          const z = (((i + 1) % 3) - 1) * (config.halfDepth * 0.65)
          group.position.set(x, config.floorY, z)
          group.rotation.y = i * 1.2
        })
      })
      .catch(() => {})
  }

  // 3. Scatter Starfish & Shell Details on Sand
  const detailCount = 8
  for (let i = 0; i < detailCount; i++) {
    const propId = SEABED_DETAIL_IDS[i % SEABED_DETAIL_IDS.length]!
    const scale = 0.03 + (i % 2) * 0.01

    loadPropModelInstance(propId, { scale })
      .then((instance) => {
        attachProp(config, decorGroup, instance, (group) => {
          const x = ((i / (detailCount - 1) - 0.5) * 1.7) * config.halfWidth + (i % 2 ? 0.3 : -0.3)
          const z = (((i * 2) % 5) / 2 - 1) * (config.halfDepth * 0.7)
          group.position.set(x, config.floorY + 0.05, z)
          group.rotation.y = i * 0.9
        })
      })
      .catch(() => {})
  }

  const seaweedCount = 6
  for (let i = 0; i < seaweedCount; i++) {
    const propId = SEAWEED_PROP_IDS[i % SEAWEED_PROP_IDS.length]!
    const scale = 0.04 + (i % 3) * 0.012
    loadPropModelInstance(propId, { scale })
      .then((instance) => {
        attachProp(config, decorGroup, instance, (group) => {
          const x = ((i / (seaweedCount - 1) - 0.5) * 1.5) * config.halfWidth
          const z = (((i + 2) % 3) - 1) * (config.halfDepth * 0.5)
          group.position.set(x, config.floorY, z)
          group.rotation.y = i * 0.7
        })
      })
      .catch(() => {})
  }

  return decorGroup
}
