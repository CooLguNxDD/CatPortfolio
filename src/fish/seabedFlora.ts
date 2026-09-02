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

/**
 * Spawns an authentic 3D coral reef landscape on the aquarium seafloor.
 */
export async function populateSeabedDecor(config: SeabedDecorConfig): Promise<THREE.Group> {
  const decorGroup = new THREE.Group()
  decorGroup.name = "seabed_3d_decor"
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
    const scale = 0.07 + (i % 4) * 0.024

    loadPropModelInstance(propId, { tintColor: col, scale })
      .then((instance) => {
        const xFrac = (i / (coralCount - 1) - 0.5) * 1.6
        const x = xFrac * config.halfWidth + (i % 2 === 0 ? 0.8 : -0.8)
        const z = ((i % 3) - 1) * (config.halfDepth * 0.55) + (i % 2 === 0 ? 0.5 : -0.5)

        instance.group.position.set(x, config.floorY + 0.1, z)
        instance.group.rotation.y = (i * Math.PI) / 3
        decorGroup.add(instance.group)
      })
      .catch(() => {})
  }

  // 2. Scatter Cavernous Reef Boulders
  const rockCount = 6
  for (let i = 0; i < rockCount; i++) {
    const propId = ROCK_PROP_IDS[i % ROCK_PROP_IDS.length]!
    const scale = 0.08 + (i % 3) * 0.03

    loadPropModelInstance(propId, { scale })
      .then((instance) => {
        const x = ((i / (rockCount - 1) - 0.5) * 1.8) * config.halfWidth
        const z = (((i + 1) % 3) - 1) * (config.halfDepth * 0.65)

        instance.group.position.set(x, config.floorY, z)
        instance.group.rotation.y = i * 1.2
        decorGroup.add(instance.group)
      })
      .catch(() => {})
  }

  // 3. Scatter Starfish & Shell Details on Sand
  const detailCount = 8
  for (let i = 0; i < detailCount; i++) {
    const propId = SEABED_DETAIL_IDS[i % SEABED_DETAIL_IDS.length]!
    const scale = 0.06 + (i % 2) * 0.02

    loadPropModelInstance(propId, { scale })
      .then((instance) => {
        const x = ((i / (detailCount - 1) - 0.5) * 1.7) * config.halfWidth + (i % 2 ? 0.3 : -0.3)
        const z = (((i * 2) % 5) / 2 - 1) * (config.halfDepth * 0.7)

        instance.group.position.set(x, config.floorY + 0.05, z)
        instance.group.rotation.y = i * 0.9
        decorGroup.add(instance.group)
      })
      .catch(() => {})
  }

  return decorGroup
}
