/**
 * Circadian rhythm cycle for the fish tank theme — split out of
 * fishTankTokens.ts, which was accumulating feature-specific logic
 * alongside the general theme token helpers. Re-exported from tokens.ts
 * so existing import sites are unaffected.
 */

import { mixHex, type CircadianPhase, type TankThemePalette } from "./fishTankTokens"

/**
 * Apply the circadian cycle on top of a theme palette.
 *
 * Day is a sunlit lagoon: golden shafts, a directional key, fast surface
 * schooling. Night is a bioluminescent reef, not a photorealistic abyss: the
 * key dims to moonlight and the fauna slow to a drift, but caustics/god-rays
 * and the coral/crystal/minnow glow go *up* — the "undersea game" read is
 * colorful water, not a black-and-cyan void.
 *
 * The sky dome is keyed by theme mode in `resolveTankThemePalette`, not the
 * clock. Light themes also skip the night water/key dim so Latte/Paper keep
 * a lagoon column under a light HUD (the ☀️/🌙/🕓 chip still cycles).
 */
export function applyCircadian(
  palette: TankThemePalette,
  phase: CircadianPhase,
): TankThemePalette {
  // Light themes keep lagoon water — night circadian on Latte/Paper is what
  // left a dark tank under a light HUD. Clock/chip still exist; they just
  // do not darken a paper sky.
  if (phase === "day" || palette.light) {
    return { ...palette, phase: "day", faunaTimeScale: 1 }
  }
  // Saturated midnight teal, not near-black — a night reef is still a
  // colorful bioluminescent dive (Subnautica-style), not a photorealistic
  // abyss. Moonlit shafts (caustics/rays) are the signature "undersea game"
  // read, so they go *up* at night, not down.
  const abyss = mixHex(palette.deep, 0x0a3d62, 0.55)
  return {
    ...palette,
    phase: "night",
    faunaTimeScale: 0.55,
    bg: mixHex(palette.bg, abyss, 0.7),
    deep: abyss,
    water: mixHex(palette.water, abyss, 0.5),
    fogColor: abyss,
    // Thinner, not thicker — color needs to survive a full dive.
    fogDensity: palette.fogDensity * 0.92,
    // Moonlight — dimmer than day but not snuffed; the fill is what lights
    // the water column itself, so it goes up rather than down.
    ambientColor: mixHex(palette.ambientColor, abyss, 0.4),
    ambientIntensity: palette.ambientIntensity * 0.7,
    keyIntensity: palette.keyIntensity * 0.55,
    hemiIntensity: palette.hemiIntensity * 0.75,
    fillIntensity: palette.fillIntensity * 1.15,
    causticStrength: palette.causticStrength * 1.2,
    rayStrength: palette.rayStrength * 1.25,
    // Red still dies first, but green/blue travel further so the column
    // stays teal at range instead of crushing to ink.
    sigma: [palette.sigma[0] * 1.08, palette.sigma[1] * 0.92, palette.sigma[2] * 0.8],
    motes: mixHex(palette.motes, palette.cyan, 0.4),
    bubble: mixHex(palette.bubble, palette.cyan, 0.35),
  }
}
