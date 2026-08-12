/**
 * Giant Teddy Cat Model & Animation System (with Glowing / Growing Yellow Eyes).
 *
 * Perched majestically on the rim of the fish tank, overlooking the aquatic domain.
 * Features:
 * - Natural plush "teddy cat" aesthetics: cozy warm mocha/charcoal coat, creamy marshmallow
 *   chest & muzzle, chubby rounded cheeks, soft pink kitten nose & toe beans, cute golden bell.
 * - Glowing / Growing Yellow Eyes: Brilliant glowing golden-amber eyes that dynamically
 *   grow/dilate wide when focusing on swimming fish to hunt, casting warm light down into the water.
 * - Articulated skeleton: full 3D head gaze-tracking (yaw/pitch IK looking at fish/cursor),
 *   independent ear twitching, 7-segment fluid tail with hunting twitch, breathing chest,
 *   support paw gripping the glass rim, and an active hunting paw that swats at fish!
 * - Multi-state hunting AI: idle surveillance -> stalk alert -> swat & splash reaction!
 */

import * as THREE from "three"
import type { Vec3 } from "@/blocks/fishTankLayout"
import { makeXorshift32 } from "./audioMath"

export interface CatParts {
  group: THREE.Group
  rig: THREE.Group
  body: THREE.Group
  headPivot: THREE.Group
  head: THREE.Group
  muzzle: THREE.Group
  earL: THREE.Group
  earR: THREE.Group
  eyeL: THREE.Mesh
  eyeR: THREE.Mesh
  pupilL: THREE.Mesh
  pupilR: THREE.Mesh
  pawActive: THREE.Group
  pawActiveForearm: THREE.Group
  pawActiveHand: THREE.Group
  pawSupport: THREE.Group
  tailGroup: THREE.Group
  tailSegments: THREE.Group[]
  bellLight: THREE.PointLight
  eyeLight: THREE.PointLight
  hitBox: THREE.Mesh
  materials: {
    fur: THREE.MeshStandardMaterial
    furCream: THREE.MeshStandardMaterial
    pink: THREE.MeshStandardMaterial
    collar: THREE.MeshStandardMaterial
    bell: THREE.MeshStandardMaterial
    eye: THREE.MeshStandardMaterial
    pupil: THREE.MeshBasicMaterial
    whisker: THREE.MeshStandardMaterial
    claw: THREE.MeshStandardMaterial
  }
}

export interface CatAnimationState {
  huntCommit: number // 0 (calm) -> 1 (intense hunt)
  pupilDilation: number // 0.18 (thin slit) -> 0.85 (huge round pupil)
  swatProgress: number // 0 (idle) -> 1 (mid-strike) -> 0 (recovered)
  swatTarget: Vec3 | null
  gazeTarget: Vec3
  currentGaze: Vec3
  lastSwatTime: number
  buttWiggle: number
  blinkTimer: number
  isBlinking: boolean
  earTwitchL: number
  earTwitchR: number
  pawWaterDist: number
  /** Deterministic jitter stream for blink timing / ear twitch — see stepCatAnimation. */
  rand: () => number
}

/**
 * Builds the complete Giant Teddy Cat model with glowing yellow eyes.
 */
export function buildGiantCatMesh(waterY: number): { group: THREE.Group; parts: CatParts } {
  const root = new THREE.Group()
  root.name = "giant_teddy_cat_root"

  // 1. Cozy Plush Materials (Soft, natural teddy fur; only eyes glow)
  const fur = new THREE.MeshStandardMaterial({
    color: 0x665243, // Rich warm mocha plush fur
    emissive: 0x241c16,
    emissiveIntensity: 0.75,
    roughness: 0.82,
    metalness: 0.04,
    flatShading: true,
  })

  const furCream = new THREE.MeshStandardMaterial({
    color: 0xf6efe2, // Soft marshmallow cream for chest, belly, cheeks
    emissive: 0x4e3e2f,
    emissiveIntensity: 0.75,
    roughness: 0.85,
    metalness: 0.02,
    flatShading: true,
  })

  const pink = new THREE.MeshStandardMaterial({
    color: 0xf472b6, // Soft rosy pink for toe beans, kitten nose, inner ears
    emissive: 0x5c1a38,
    emissiveIntensity: 0.6,
    roughness: 0.68,
    metalness: 0.05,
    flatShading: true,
  })

  const collar = new THREE.MeshStandardMaterial({
    color: 0xb91c1c, // Cozy crimson collar strap
    roughness: 0.5,
    metalness: 0.1,
  })

  const bell = new THREE.MeshStandardMaterial({
    color: 0xfbbf24, // Cute golden jingle bell
    emissive: 0xd97706,
    emissiveIntensity: 0.6,
    roughness: 0.2,
    metalness: 0.85,
  })

  // Hero Feature: Radiant Glowing Yellow Eyes
  const eye = new THREE.MeshStandardMaterial({
    color: 0xffd000,
    emissive: 0xffaa00,
    emissiveIntensity: 3.4, // Standout vibrant glow!
    roughness: 0.1,
    metalness: 0.1,
  })

  const pupil = new THREE.MeshBasicMaterial({
    color: 0x020406, // Deep dark feline pupil that expands/dilates
  })

  const whisker = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.85,
    roughness: 0.25,
  })

  const claw = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.3,
    metalness: 0.2,
  })

  const rig = new THREE.Group()
  rig.name = "cat_rig"
  root.add(rig)

  // 2. Torso / Body in comfortable hunting crouch
  const body = new THREE.Group()
  body.name = "cat_body"
  rig.add(body)

  // Main chest (plump, rounded, forward-angled toward water)
  const chestGeo = new THREE.CylinderGeometry(2.4, 3.1, 4.6, 9)
  const chest = new THREE.Mesh(chestGeo, fur)
  chest.position.set(0, 2.2, 0.3)
  chest.rotation.x = 0.36
  chest.scale.set(1.18, 1.0, 0.95)
  body.add(chest)

  // Creamy chest fluff / bib
  const chestFluffGeo = new THREE.SphereGeometry(2.4, 8, 7)
  const chestFluff = new THREE.Mesh(chestFluffGeo, furCream)
  chestFluff.position.set(0, 2.05, 0.7)
  chestFluff.rotation.x = 0.36
  chestFluff.scale.set(0.95, 1.05, 0.7)
  body.add(chestFluff)

  // Arched cozy spine / midsection
  const spineGeo = new THREE.CylinderGeometry(2.2, 2.5, 4.0, 9)
  const spine = new THREE.Mesh(spineGeo, fur)
  spine.position.set(0, 3.0, -2.7)
  spine.rotation.x = -0.3
  body.add(spine)

  // Plump rounded Pelvis / Haunches (crouched ready to pounce)
  const pelvisGeo = new THREE.SphereGeometry(2.9, 10, 9)
  const pelvis = new THREE.Mesh(pelvisGeo, fur)
  pelvis.position.set(0, 3.5, -4.8)
  pelvis.scale.set(1.2, 1.25, 1.35)
  body.add(pelvis)

  // Crimson Collar
  const collarRingGeo = new THREE.CylinderGeometry(2.1, 2.25, 0.45, 16)
  const collarMesh = new THREE.Mesh(collarRingGeo, collar)
  collarMesh.position.set(0, 3.3, 1.8)
  collarMesh.rotation.x = 0.45
  body.add(collarMesh)

  // Cute Golden Bell
  const bellGroup = new THREE.Group()
  bellGroup.position.set(0, -1.9, 0.7)
  collarMesh.add(bellGroup)

  const bellGeo = new THREE.SphereGeometry(0.45, 8, 7)
  const bellMesh = new THREE.Mesh(bellGeo, bell)
  bellGroup.add(bellMesh)

  const bellRimGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.08, 12)
  const bellRim = new THREE.Mesh(bellRimGeo, bell)
  bellRim.rotation.x = Math.PI / 2
  bellGroup.add(bellRim)

  const bellLight = new THREE.PointLight(0xfbbf24, 0.4, 6)
  bellLight.position.set(0, -0.2, 0.3)
  bellGroup.add(bellLight)

  // 3. Head, Neck & Chubby Teddy Face (Articulated on Head Pivot for tracking)
  const neckGeo = new THREE.CylinderGeometry(1.7, 2.1, 2.3, 8)
  const neck = new THREE.Mesh(neckGeo, fur)
  neck.position.set(0, 3.6, 1.7)
  neck.rotation.x = 0.48
  body.add(neck)

  const headPivot = new THREE.Group()
  headPivot.name = "cat_head_pivot"
  headPivot.position.set(0, 4.5, 2.5)
  body.add(headPivot)

  const head = new THREE.Group()
  head.name = "cat_head"
  headPivot.add(head)

  // Cranium: Chubby rounded teddy feline skull
  const skullGeo = new THREE.SphereGeometry(2.6, 12, 10)
  const skull = new THREE.Mesh(skullGeo, fur)
  skull.scale.set(1.22, 1.05, 1.1)
  head.add(skull)

  // Cute chubby teddy cheeks (giving the adorable British Shorthair look)
  for (const side of [-1, 1] as const) {
    const cheekGeo = new THREE.SphereGeometry(1.4, 8, 7)
    const cheek = new THREE.Mesh(cheekGeo, furCream)
    cheek.position.set(side * 1.5, -0.4, 0.7)
    cheek.scale.set(1.0, 0.9, 1.1)
    head.add(cheek)
  }

  // Muzzle group
  const muzzle = new THREE.Group()
  muzzle.name = "cat_muzzle"
  muzzle.position.set(0, -0.3, 2.0)
  head.add(muzzle)

  // Whisker pads (dual soft cream lobes)
  for (const side of [-1, 1] as const) {
    const padGeo = new THREE.SphereGeometry(0.78, 8, 7)
    const padMesh = new THREE.Mesh(padGeo, furCream)
    padMesh.position.set(side * 0.55, -0.15, 0.35)
    padMesh.scale.set(1.0, 0.85, 1.1)
    muzzle.add(padMesh)

    // Soft white whiskers (3 per side)
    for (let w = 0; w < 3; w++) {
      const wGeo = new THREE.CylinderGeometry(0.02, 0.01, 2.4, 4)
      wGeo.translate(0, 1.2, 0)
      const whiskerMesh = new THREE.Mesh(wGeo, whisker)
      whiskerMesh.position.set(side * 0.85, -0.05 + w * 0.12, 0.4)
      whiskerMesh.rotation.set(
        (w - 1) * 0.1 + 0.08,
        side * (0.85 + w * 0.08),
        -side * (Math.PI / 2 - 0.15 + w * 0.1),
      )
      whiskerMesh.name = `whisker_${side > 0 ? "R" : "L"}_${w}`
      muzzle.add(whiskerMesh)
    }
  }

  // Soft rounded pink kitten nose
  const noseGeo = new THREE.SphereGeometry(0.38, 7, 6)
  const noseMesh = new THREE.Mesh(noseGeo, pink)
  noseMesh.position.set(0, 0.15, 0.95)
  noseMesh.scale.set(1.15, 0.75, 0.85)
  muzzle.add(noseMesh)

  // Cute lower chin
  const chinGeo = new THREE.SphereGeometry(0.65, 7, 6)
  const chin = new THREE.Mesh(chinGeo, furCream)
  chin.position.set(0, -0.65, 0.35)
  chin.scale.set(0.9, 0.7, 0.9)
  muzzle.add(chin)

  // Expressive Curved Teddy Ears on Pivots
  const earL = new THREE.Group()
  earL.name = "earL"
  earL.position.set(-1.6, 2.2, 0.1)
  earL.rotation.set(0.08, -0.12, -0.25)
  head.add(earL)

  const earR = new THREE.Group()
  earR.name = "earR"
  earR.position.set(1.6, 2.2, 0.1)
  earR.rotation.set(0.08, 0.12, 0.25)
  head.add(earR)

  for (const earGroup of [earL, earR]) {
    // Outer rounded teddy ear
    const earOuterGeo = new THREE.ConeGeometry(1.25, 2.3, 6)
    const earOuter = new THREE.Mesh(earOuterGeo, fur)
    earOuter.scale.set(0.9, 1.0, 0.6)
    earGroup.add(earOuter)

    // Inner rosy pink ear
    const earInnerGeo = new THREE.ConeGeometry(0.85, 1.8, 4)
    const earInner = new THREE.Mesh(earInnerGeo, pink)
    earInner.position.set(0, -0.15, 0.16)
    earInner.scale.set(0.8, 0.92, 0.25)
    earGroup.add(earInner)
  }

  // 4. Standout Feature: Glowing Feline Eyes & Growing Slit Pupils
  const eyeGeo = new THREE.SphereGeometry(0.72, 10, 9)
  const pupilGeo = new THREE.SphereGeometry(0.74, 8, 7)

  const eyeLMesh = new THREE.Mesh(eyeGeo, eye)
  eyeLMesh.name = "eyeL"
  eyeLMesh.position.set(-1.05, 0.35, 2.1)
  eyeLMesh.scale.set(0.92, 1.15, 0.7)
  eyeLMesh.rotation.set(0.1, -0.16, 0.12)
  head.add(eyeLMesh)

  const pupilLMesh = new THREE.Mesh(pupilGeo, pupil)
  pupilLMesh.name = "pupilL"
  pupilLMesh.position.set(0, 0, 0.22)
  pupilLMesh.scale.set(0.24, 0.95, 0.8) // Will grow/dilate dynamically!
  eyeLMesh.add(pupilLMesh)

  const eyeRMesh = new THREE.Mesh(eyeGeo, eye)
  eyeRMesh.name = "eyeR"
  eyeRMesh.position.set(1.05, 0.35, 2.1)
  eyeRMesh.scale.set(0.92, 1.15, 0.7)
  eyeRMesh.rotation.set(0.1, 0.16, -0.12)
  head.add(eyeRMesh)

  const pupilRMesh = new THREE.Mesh(pupilGeo, pupil)
  pupilRMesh.name = "pupilR"
  pupilRMesh.position.set(0, 0, 0.22)
  pupilRMesh.scale.set(0.24, 0.95, 0.8)
  eyeRMesh.add(pupilRMesh)

  // Warm golden eye light illuminating the cat's face and the water below
  const eyeLight = new THREE.PointLight(0xfbbf24, 1.8, 22)
  eyeLight.position.set(0, 0.3, 3.2)
  head.add(eyeLight)

  // 5. Plush Front Limbs & Chunky Paws on the Rim
  // Support Paw (Right) — firmly planted on the glass rim with pink toe beans
  const pawSupport = new THREE.Group()
  pawSupport.name = "cat_paw_support"
  pawSupport.position.set(2.8, 1.8, 1.4)
  rig.add(pawSupport)

  const supArmGeo = new THREE.CylinderGeometry(0.75, 0.9, 4.4, 8)
  const supArm = new THREE.Mesh(supArmGeo, fur)
  supArm.position.set(0.2, -1.8, 0.6)
  supArm.rotation.set(0.35, 0, -0.15)
  pawSupport.add(supArm)

  const supPadGroup = new THREE.Group()
  supPadGroup.position.set(0.45, -3.8, 1.6)
  pawSupport.add(supPadGroup)

  const supPadGeo = new THREE.SphereGeometry(1.2, 8, 7)
  const supPad = new THREE.Mesh(supPadGeo, furCream)
  supPad.scale.set(1.15, 0.65, 1.3)
  supPadGroup.add(supPad)

  // Pink toe beans on support paw
  for (let i = 0; i < 4; i++) {
    const toeGeo = new THREE.SphereGeometry(0.38, 6, 6)
    const toe = new THREE.Mesh(toeGeo, pink)
    toe.position.set((i - 1.5) * 0.44, -0.1, 0.92)
    supPadGroup.add(toe)

    // Gentle natural claws resting over rim
    const clawGeo = new THREE.ConeGeometry(0.08, 0.35, 4)
    const clawMesh = new THREE.Mesh(clawGeo, claw)
    clawMesh.position.set((i - 1.5) * 0.44, -0.2, 1.15)
    clawMesh.rotation.x = Math.PI / 2 + 0.25
    supPadGroup.add(clawMesh)
  }

  // Active Hunting / Swatting Paw (Left) — Articulated for strikes & dipping
  const pawActive = new THREE.Group()
  pawActive.name = "paw" // backward compatible name "paw"
  pawActive.position.set(-2.8, 2.0, 1.2)
  rig.add(pawActive)

  const actUpperArmGeo = new THREE.CylinderGeometry(0.8, 0.9, 3.2, 8)
  const actUpperArm = new THREE.Mesh(actUpperArmGeo, fur)
  actUpperArm.position.set(-0.2, -1.4, 0.3)
  actUpperArm.rotation.set(0.28, 0, 0.2)
  pawActive.add(actUpperArm)

  const pawActiveForearm = new THREE.Group()
  pawActiveForearm.name = "cat_paw_active_forearm"
  pawActiveForearm.position.set(-0.4, -2.8, 0.7)
  pawActive.add(pawActiveForearm)

  const actForearmGeo = new THREE.CylinderGeometry(0.7, 0.8, 3.2, 8)
  const actForearm = new THREE.Mesh(actForearmGeo, fur)
  actForearm.position.set(-0.1, -1.3, 0.3)
  actForearm.rotation.set(0.15, 0, 0.05)
  pawActiveForearm.add(actForearm)

  const pawActiveHand = new THREE.Group()
  pawActiveHand.name = "cat_paw_active_hand"
  pawActiveHand.position.set(-0.2, -2.7, 0.7)
  pawActiveForearm.add(pawActiveHand)

  const actPadGeo = new THREE.SphereGeometry(1.25, 9, 8)
  const actPad = new THREE.Mesh(actPadGeo, furCream)
  actPad.scale.set(1.18, 0.68, 1.35)
  pawActiveHand.add(actPad)

  // Pink Palm Pad
  const palmGeo = new THREE.SphereGeometry(0.6, 6, 6)
  const palm = new THREE.Mesh(palmGeo, pink)
  palm.position.set(0, -0.3, 0)
  palm.scale.set(1.15, 0.32, 1.05)
  pawActiveHand.add(palm)

  // Soft Pink Toe Beans & Cute Retractable Claws
  for (let i = 0; i < 4; i++) {
    const toeGeo = new THREE.SphereGeometry(0.38, 6, 6)
    const toe = new THREE.Mesh(toeGeo, pink)
    toe.position.set((i - 1.5) * 0.46, -0.15, 0.98)
    toe.scale.set(0.95, 0.65, 0.95)
    pawActiveHand.add(toe)

    const clawGeo = new THREE.ConeGeometry(0.08, 0.45, 4)
    const clawMesh = new THREE.Mesh(clawGeo, claw)
    clawMesh.position.set((i - 1.5) * 0.46, -0.22, 1.3)
    clawMesh.rotation.x = Math.PI / 2 + 0.25
    clawMesh.name = `claw_${i}`
    pawActiveHand.add(clawMesh)
  }

  // 6. Coiled Hindquarters & Rear Legs
  for (const side of [-1, 1] as const) {
    const thighGroup = new THREE.Group()
    thighGroup.position.set(side * 2.9, 3.3, -4.3)
    rig.add(thighGroup)

    const thighGeo = new THREE.SphereGeometry(2.2, 9, 8)
    const thigh = new THREE.Mesh(thighGeo, fur)
    thigh.scale.set(0.88, 1.55, 1.3)
    thigh.rotation.set(-0.4, 0, side * 0.2)
    thighGroup.add(thigh)

    const shankGeo = new THREE.CylinderGeometry(0.75, 0.95, 3.6, 8)
    const shank = new THREE.Mesh(shankGeo, fur)
    shank.position.set(side * 0.2, -2.4, 0.8)
    shank.rotation.set(0.7, 0, -side * 0.15)
    thighGroup.add(shank)

    const rearPawGeo = new THREE.SphereGeometry(1.1, 8, 7)
    const rearPaw = new THREE.Mesh(rearPawGeo, furCream)
    rearPaw.position.set(side * 0.3, -3.7, 2.2)
    rearPaw.scale.set(1.05, 0.58, 1.25)
    thighGroup.add(rearPaw)
  }

  // 7. Fluffy 7-Segment Curled Teddy Tail
  const tailGroup = new THREE.Group()
  tailGroup.name = "cat_tail" // backward compatible name
  tailGroup.position.set(0, 3.9, -5.8)
  rig.add(tailGroup)

  const tailSegments: THREE.Group[] = []
  let parentTail: THREE.Group = tailGroup

  const numTailSegs = 7
  for (let i = 0; i < numTailSegs; i++) {
    const segGroup = new THREE.Group()
    segGroup.name = `tail_seg_${i}`
    segGroup.position.set(0, i === 0 ? 0 : 0.88, -0.65)
    parentTail.add(segGroup)
    tailSegments.push(segGroup)

    const segRadius = Math.max(0.32, 0.72 - i * 0.05)
    const segGeo = new THREE.CylinderGeometry(segRadius * 0.9, segRadius, 0.95, 8)
    const segMesh = new THREE.Mesh(segGeo, i >= numTailSegs - 2 ? furCream : fur)
    segMesh.position.set(0, 0.45, 0)
    segGroup.add(segMesh)

    parentTail = segGroup
  }

  // Soft rounded fluffy tail tip
  const tipGeo = new THREE.SphereGeometry(0.48, 8, 7)
  const tipMesh = new THREE.Mesh(tipGeo, furCream)
  tipMesh.position.set(0, 0.85, 0)
  parentTail.add(tipMesh)

  // 8. Interactive Raycast HitBox for pointer clicks & hover
  const hitBoxGeo = new THREE.SphereGeometry(6.5, 8, 6)
  const hitBox = new THREE.Mesh(
    hitBoxGeo,
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  )
  hitBox.name = "cat_hit"
  hitBox.position.set(0, 3.2, 0)
  root.add(hitBox)

  // Warm deck spotlight highlighting the teddy cat's plush fur
  const catDeckLight = new THREE.PointLight(0xffedd5, 1.4, 32)
  catDeckLight.position.set(2, 6, 8)
  root.add(catDeckLight)

  // Root positioning on the rim
  root.position.set(0, waterY + 0.6, 0)

  const parts: CatParts = {
    group: root,
    rig,
    body,
    headPivot,
    head,
    muzzle,
    earL,
    earR,
    eyeL: eyeLMesh,
    eyeR: eyeRMesh,
    pupilL: pupilLMesh,
    pupilR: pupilRMesh,
    pawActive,
    pawActiveForearm,
    pawActiveHand,
    pawSupport,
    tailGroup,
    tailSegments,
    bellLight,
    eyeLight,
    hitBox,
    materials: {
      fur,
      furCream,
      pink,
      collar,
      bell,
      eye,
      pupil,
      whisker,
      claw,
    },
  }

  return { group: root, parts }
}

/**
 * Creates the runtime animation controller state for the giant teddy cat.
 */
export function createCatAnimationState(): CatAnimationState {
  return {
    huntCommit: 0,
    pupilDilation: 0.24,
    swatProgress: 0,
    swatTarget: null,
    gazeTarget: { x: 0, y: 0, z: 0 },
    currentGaze: { x: 0, y: 0, z: 0 },
    lastSwatTime: -999,
    buttWiggle: 0,
    blinkTimer: 2.5,
    isBlinking: false,
    earTwitchL: 0,
    earTwitchR: 0,
    pawWaterDist: 10,
    // Math.random() here would break reproducibility of blink/twitch timing
    // across runs and tests; fixed seed is fine since only one cat exists.
    rand: makeXorshift32(0x5eedc47),
  }
}

/**
 * Updates the giant teddy cat's posture, gaze-tracking, pupil dilation growth,
 * hunting swat, and breathing animations.
 */
export function stepCatAnimation(
  parts: CatParts,
  state: CatAnimationState,
  params: {
    t: number
    dt: number
    catWorldPos: Vec3
    targetPos: Vec3 | null
    isHunting: boolean
    triggerSwat?: boolean
    onWaterSplash?: (pos: Vec3) => void
  },
): void {
  const { t, dt, catWorldPos, targetPos, isHunting, triggerSwat, onWaterSplash } = params

  // 1. Hunt Commitment & Alertness
  const targetHunt = isHunting || (targetPos !== null && targetPos.y > catWorldPos.y - 18) ? 1 : 0
  state.huntCommit += (targetHunt - state.huntCommit) * Math.min(1, dt * 3.5)

  // 2. Gaze Target & Head IK
  if (targetPos) {
    state.gazeTarget = targetPos
  } else {
    // Ambient wandering gaze across the tank
    state.gazeTarget = {
      x: catWorldPos.x - 14 + Math.sin(t * 0.4) * 12,
      y: catWorldPos.y - 6 + Math.sin(t * 0.7) * 4,
      z: Math.cos(t * 0.5) * 10,
    }
  }

  // Smooth lerp current gaze
  const gazeLerpSpeed = state.huntCommit > 0.5 ? 6.0 : 3.0
  state.currentGaze.x += (state.gazeTarget.x - state.currentGaze.x) * Math.min(1, dt * gazeLerpSpeed)
  state.currentGaze.y += (state.gazeTarget.y - state.currentGaze.y) * Math.min(1, dt * gazeLerpSpeed)
  state.currentGaze.z += (state.gazeTarget.z - state.currentGaze.z) * Math.min(1, dt * gazeLerpSpeed)

  // Compute relative angle to target from head pivot
  const dx = state.currentGaze.x - catWorldPos.x
  const dy = state.currentGaze.y - (catWorldPos.y + 4.5)
  const dz = state.currentGaze.z - catWorldPos.z
  const distXZ = Math.sqrt(dx * dx + dz * dz)

  // Head yaw & pitch
  const targetYaw = Math.atan2(dx, dz)
  const targetPitch = -Math.atan2(dy, Math.max(1, distXZ))

  // Clamp biomechanical neck range
  const clampedYaw = Math.max(-1.25, Math.min(1.25, targetYaw))
  const clampedPitch = Math.max(-0.85, Math.min(0.65, targetPitch))

  parts.headPivot.rotation.y = clampedYaw
  parts.headPivot.rotation.x = clampedPitch + Math.sin(t * 1.8) * 0.02
  parts.headPivot.rotation.z = Math.sin(t * 1.1) * 0.03 - clampedYaw * 0.15

  // 3. Breathing & Spine Posture (Teddy Hunting Crouch)
  const crouch = state.huntCommit * 0.55
  const breath = Math.sin(t * 1.6) * 0.06 * (1 - crouch * 0.7)

  parts.rig.position.y = -crouch + breath
  parts.rig.position.z = crouch * 0.4
  parts.body.rotation.x = crouch * 0.12

  // Butt-wiggle preparation before strike
  if (state.huntCommit > 0.7 && state.swatProgress === 0) {
    state.buttWiggle = Math.sin(t * 14) * 0.12 * state.huntCommit
  } else {
    state.buttWiggle *= 0.85
  }
  parts.body.rotation.z = state.buttWiggle

  // 4. Hero Feature: Glowing Yellow Eyes & Growing/Dilating Pupils
  state.blinkTimer -= dt
  if (state.blinkTimer <= 0) {
    state.isBlinking = true
    if (state.blinkTimer <= -0.14) {
      state.isBlinking = false
      state.blinkTimer = 2.5 + (state.rand() + 1) * 0.5 * 4.0
    }
  }

  const blinkScale = state.isBlinking ? 0.08 : 1.0
  parts.eyeL.scale.y = 1.15 * blinkScale
  parts.eyeR.scale.y = 1.15 * blinkScale

  // Growing/dilating pupils: expands from thin slit (0.2) to wide big sphere (0.8) when hunting!
  const targetPupil = 0.22 + state.huntCommit * 0.6 + Math.sin(t * 1.8) * 0.05
  state.pupilDilation += (targetPupil - state.pupilDilation) * Math.min(1, dt * 5.0)

  parts.pupilL.scale.x = state.pupilDilation
  parts.pupilL.scale.y = Math.min(0.95, 0.75 + state.pupilDilation * 0.2)
  parts.pupilR.scale.x = state.pupilDilation
  parts.pupilR.scale.y = Math.min(0.95, 0.75 + state.pupilDilation * 0.2)

  // Dynamic eye glow pulse
  const eyePulse = 1.0 + state.huntCommit * 0.4 + Math.sin(t * 3.0) * 0.15
  parts.eyeLight.intensity = 1.8 * eyePulse
  parts.materials.eye.emissiveIntensity = 2.8 * eyePulse

  // 5. Ears: Alert / Twitching
  if ((state.rand() + 1) * 0.5 < 0.015) state.earTwitchL = 0.35
  if ((state.rand() + 1) * 0.5 < 0.015) state.earTwitchR = 0.35
  state.earTwitchL *= 0.88
  state.earTwitchR *= 0.88

  const earAlert = state.huntCommit * -0.3
  parts.earL.rotation.x = 0.08 + earAlert + Math.sin(t * 3.0) * state.earTwitchL
  parts.earL.rotation.z = -0.25 - state.huntCommit * 0.1
  parts.earR.rotation.x = 0.08 + earAlert + Math.cos(t * 3.0) * state.earTwitchR
  parts.earR.rotation.z = 0.25 + state.huntCommit * 0.1

  // 6. Whiskers Micro-Twitch
  const whiskerTwitch = Math.sin(t * 7.0) * (0.03 + state.huntCommit * 0.06)
  parts.muzzle.rotation.y = whiskerTwitch

  // 7. Swatting / Hunting Strike Action
  if (triggerSwat && state.swatProgress === 0 && t - state.lastSwatTime > 1.2) {
    state.swatProgress = 0.01
    state.lastSwatTime = t
    state.swatTarget = targetPos ?? {
      x: catWorldPos.x - 4,
      y: catWorldPos.y - 1,
      z: 2,
    }
  }

  if (state.swatProgress > 0) {
    state.swatProgress += dt * 2.8 // strike speed

    if (state.swatProgress < 0.45) {
      // Wind-up & lunge downward
      const prog = state.swatProgress / 0.45
      parts.pawActive.rotation.x = -prog * 0.8
      parts.pawActive.rotation.z = 0.2 + prog * 0.4
      parts.pawActiveForearm.rotation.x = -prog * 0.6
      parts.pawActiveHand.rotation.x = prog * 1.1
    } else if (state.swatProgress < 0.65) {
      // Strike impact & water dip
      const prog = (state.swatProgress - 0.45) / 0.2
      parts.pawActive.rotation.x = -0.8 + prog * 1.2
      parts.pawActive.rotation.z = 0.6 - prog * 0.3
      parts.pawActiveForearm.rotation.x = -0.6 + prog * 0.9
      parts.pawActiveHand.rotation.x = 1.1 - prog * 0.4

      // Trigger splash at lowest point of strike
      if (prog > 0.4 && onWaterSplash && state.swatTarget) {
        onWaterSplash(state.swatTarget)
      }
    } else if (state.swatProgress < 1.0) {
      // Recovery back to rim
      const prog = (state.swatProgress - 0.65) / 0.35
      parts.pawActive.rotation.x = 0.4 * (1 - prog)
      parts.pawActive.rotation.z = 0.3 * (1 - prog) + 0.2 * prog
      parts.pawActiveForearm.rotation.x = 0.3 * (1 - prog)
      parts.pawActiveHand.rotation.x = 0.7 * (1 - prog)
    } else {
      state.swatProgress = 0
    }
  } else {
    // Idle / Hunting hover for active paw
    const hoverDip = state.huntCommit * 0.65
    parts.pawActive.rotation.x = -hoverDip * 0.4 + Math.sin(t * 2.2) * 0.06
    parts.pawActive.rotation.z = 0.2 + hoverDip * 0.2 + Math.sin(t * 1.5) * 0.04
    parts.pawActiveForearm.rotation.x = hoverDip * 0.25
    parts.pawActiveHand.rotation.x = hoverDip * 0.3
  }

  // 8. Fluid Fluffy 7-Segment Tail Animation (S-Curve wave + Hunting twitch)
  const tailSpeed = 1.2 + state.huntCommit * 3.6
  const tailAmp = 0.24 + state.huntCommit * 0.35

  const numSegs = parts.tailSegments.length
  for (let i = 0; i < numSegs; i++) {
    const seg = parts.tailSegments[i]
    if (!seg) continue

    const phase = i * 0.52
    const segAmp = tailAmp * (0.4 + (i / numSegs) * 0.9)

    // S-curve sinuous wave
    seg.rotation.y = Math.sin(t * tailSpeed - phase) * segAmp
    seg.rotation.x = -0.18 + Math.cos(t * tailSpeed * 0.5 - phase) * (segAmp * 0.5)

    // High frequency predator twitch at the fluffy tip
    if (i >= numSegs - 2 && state.huntCommit > 0.5) {
      seg.rotation.y += Math.sin(t * 15.0) * 0.24 * state.huntCommit
      seg.rotation.z = Math.cos(t * 15.0) * 0.18 * state.huntCommit
    }
  }
}
