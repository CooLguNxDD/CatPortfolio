/**
 * Ambient 3D Marine Life Shoal Engine
 * Populates the 3D aquarium volume with authentic animated fish and sea creatures
 * from the 98 ported models across pelagic, reef, and benthic depth bands.
 */

import * as THREE from "three"
import { loadFishModelInstance, type LoadedFishInstance } from "./modelLoader"

export interface AmbientShoalConfig {
  tank: THREE.Group
  qualityTier: "high" | "low"
  swimMinY: number
  swimMaxY: number
  halfWidth: number
  halfDepth: number
}

interface AmbientCreature {
  instance: LoadedFishInstance
  baseY: number
  orbitRadius: number
  orbitSpeed: number
  orbitPhase: number
  wobbleSpeed: number
  wobbleAmp: number
  depthBand: "surface" | "mid" | "deep"
}

// Curated selection of diverse animated marine species
const AMBIENT_SPECIES_BY_DEPTH = {
  surface: ["GreenTurtle", "HectorDolphin", "LeatherbackTurtle"],
  mid: [
    "BlueTang",
    "FlameAngelfish",
    "CopperbandButterflyfish",
    "YellowTang",
    "TomatoClownfish",
    "GreenChromis",
    "PowderBlueTang",
    "MoorishIdol",
    "FrenchAngelfish",
  ],
  deep: ["MantaRay", "SpottedEagleRay", "ZebraSeahorse", "BlueLobster", "PantherGrouper"],
}

export class AmbientFishShoal {
  private creatures: AmbientCreature[] = []
  private group: THREE.Group
  private config: AmbientShoalConfig

  constructor(config: AmbientShoalConfig) {
    this.config = config
    this.group = new THREE.Group()
    this.group.name = "ambient_3d_shoal"
    this.config.tank.add(this.group)
    this.spawnCreatures()
  }

  private async spawnCreatures() {
    const isHigh = this.config.qualityTier === "high"
    const count = isHigh ? 10 : 5

    const { swimMinY, swimMaxY, halfWidth } = this.config
    const tankHeight = swimMaxY - swimMinY

    for (let i = 0; i < count; i++) {
      let depthBand: "surface" | "mid" | "deep"
      let speciesList: string[]
      let targetY: number

      if (i % 4 === 0) {
        depthBand = "surface"
        speciesList = AMBIENT_SPECIES_BY_DEPTH.surface
        targetY = swimMaxY - 2.5 - Math.random() * 3
      } else if (i % 4 === 3) {
        depthBand = "deep"
        speciesList = AMBIENT_SPECIES_BY_DEPTH.deep
        targetY = swimMinY + 1.5 + Math.random() * 4
      } else {
        depthBand = "mid"
        speciesList = AMBIENT_SPECIES_BY_DEPTH.mid
        targetY = swimMinY + tankHeight * 0.35 + Math.random() * (tankHeight * 0.4)
      }

      const species = speciesList[i % speciesList.length]!

      try {
        const instance = await loadFishModelInstance(species, {
          emissiveGlow: 0.2,
        })

        // Scale ambient creatures slightly smaller (~0.65 - 0.85) so hero specimens remain prominent
        const ambientScale = 0.65 + (i % 3) * 0.1
        instance.group.scale.multiplyScalar(ambientScale)

        const orbitRadius = halfWidth * 0.45 + (i % 4) * 3.5
        const orbitSpeed = (0.12 + (i % 3) * 0.05) * (i % 2 === 0 ? 1 : -0.85)
        const orbitPhase = (i * Math.PI * 2) / count + Math.random() * 0.5
        const wobbleSpeed = 1.0 + Math.random() * 0.8
        const wobbleAmp = 0.4 + Math.random() * 0.5

        this.group.add(instance.group)
        this.creatures.push({
          instance,
          baseY: targetY,
          orbitRadius: Math.min(orbitRadius, halfWidth - 3),
          orbitSpeed,
          orbitPhase,
          wobbleSpeed,
          wobbleAmp,
          depthBand,
        })
      } catch (err) {
        // Silently skip if asset not available
      }
    }
  }

  /**
   * Ticks orbit locomotion and skeletal animation mixers for all ambient creatures.
   */
  public update(dt: number, t: number) {
    const { halfDepth } = this.config

    for (const c of this.creatures) {
      // 1. Tick Skeletal AnimationMixer
      if (c.instance.mixer) {
        c.instance.mixer.update(dt * 1.1)
      }

      // 2. Orbital Swim Locomotion
      const currentAngle = c.orbitPhase + t * c.orbitSpeed
      const x = Math.sin(currentAngle) * c.orbitRadius
      const z = Math.cos(currentAngle) * (halfDepth * 0.65)
      const y = c.baseY + Math.sin(t * c.wobbleSpeed + c.orbitPhase) * c.wobbleAmp

      c.instance.group.position.set(x, y, z)

      // 3. Heading & Natural Bank
      const forwardAngle = currentAngle + (c.orbitSpeed > 0 ? Math.PI / 2 : -Math.PI / 2)
      c.instance.group.rotation.y = forwardAngle
      c.instance.group.rotation.z = Math.sin(t * 1.5 + c.orbitPhase) * 0.08
      c.instance.group.rotation.x = Math.cos(t * c.wobbleSpeed + c.orbitPhase) * 0.05
    }
  }

  /**
   * Cleans up all ambient creature subtrees and mixers.
   */
  public dispose() {
    for (const c of this.creatures) {
      if (c.instance.mixer) {
        c.instance.mixer.stopAllAction()
      }
      this.group.remove(c.instance.group)
    }
    this.creatures = []
    this.config.tank.remove(this.group)
  }
}
