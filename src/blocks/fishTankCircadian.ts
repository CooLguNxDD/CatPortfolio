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
 * schooling. Night is a bioluminescent abyss: the key light all but goes out,
 * the medium darkens toward indigo, and the fauna slow to a drift — the glow
 * has to come from the meshes themselves.
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
  const abyss = mixHex(palette.deep, 0x040a1a, 0.55)
  return {
    ...palette,
    phase: "night",
    faunaTimeScale: 0.55,
    bg: mixHex(palette.bg, abyss, 0.7),
    deep: abyss,
    water: mixHex(palette.water, abyss, 0.5),
    fogColor: abyss,
    fogDensity: palette.fogDensity * 1.15,
    // Moonlight only — the scene is carried by emissive meshes and crystals.
    ambientColor: mixHex(palette.ambientColor, abyss, 0.55),
    ambientIntensity: palette.ambientIntensity * 0.45,
    keyIntensity: palette.keyIntensity * 0.22,
    hemiIntensity: palette.hemiIntensity * 0.4,
    fillIntensity: palette.fillIntensity * 0.7,
    causticStrength: palette.causticStrength * 0.45,
    rayStrength: palette.rayStrength * 0.5,
    // Denser water at night sells the "no sunlight gets here" read.
    sigma: [palette.sigma[0] * 1.25, palette.sigma[1] * 1.2, palette.sigma[2] * 1.1],
    motes: mixHex(palette.motes, palette.cyan, 0.4),
    bubble: mixHex(palette.bubble, palette.cyan, 0.35),
  }
}
