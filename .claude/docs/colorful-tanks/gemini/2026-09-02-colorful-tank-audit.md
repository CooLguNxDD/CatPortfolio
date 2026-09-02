# 3D Fish Tank Dark Scene Coloration & Undersea Aesthetics Audit

**Audit Date:** 2026-09-02  
**Auditor:** Gemini Agentic Reviewer  
**Target:** `http://localhost:11000/CatPortfolio/`  
**Recording Artifact:** `aquarium_deep_audit_1788337178659.webp`  

---

## 1. Executive Summary

A live interactive browser audit was performed on CatPortfolio's 3D WebGL Aquarium (`?v=3d` and default view) using browser automation tools. The evaluation focused on the visual presentation, color richness, and lighting fidelity of the **dark scene / Abyss circadian phase** compared to modern undersea game aesthetics (such as *Subnautica*, *ABZÛ*, and *Dave the Diver*).

### Overall Impression
The WebGL simulation, locomotion physics, camera controls, specimen locking with background bokeh blur, and interactive HUD elements (sonar radar, depth scrubber, feeding mechanics) operate smoothly and reliably with 0 browser console errors. 

However, in the **Abyss / Night mode**, the visual presentation currently reads as a **monochromatic dark-navy/cyan wash** rather than a **vibrant, glowing bioluminescent ecosystem**. The natural albedos of 3D models (e.g., orange clownfish stripes, sea turtle carapace tones, yellow fin highlights) become heavily suppressed, while seabed corals and environmental props fade into dark silhouettes.

---

## 2. Interactive Browser Verification Findings

| Tested Feature | Browser Behavior | Visual Observation |
| :--- | :--- | :--- |
| **Circadian Transitions** | Smoothly cycles `Auto` → `Day` → `Sunset` → `Night` | In `Day`, lighting is crisp and clear. In `Night`, `ambientIntensity` drops by 55% and `keyIntensity` drops by 78%, causing dramatic color loss. |
| **Theme Switching** | Switches between Light/Paper and Dark/Catppuccin | Dark UI chrome integrates cleanly with the dark tank, but reinforces the low-contrast dark-cyan overall palette. |
| **Specimen Dossier & Bokeh** | Clicking a fish (e.g., Blue Tang) locks camera and opens modal | `BokehPass` effectively blurs background while keeping the subject sharp, but the subject lacks emissive pop. |
| **Feeding & Physics** | `Feed` action drops animated pellets | Pellets sink with physical sway and stimulate fish feeding behavior. |
| **Flora & Reef Props** | Corals, seaweeds, rocks rendered on seabed | Props currently draw from restricted domain tokens (`cyan`, `neon`, `amber`) and lack emissive polyps. |

---

## 3. Root Cause Analysis: Why the Dark Scene Looks Muted

1. **Overly Aggressive Night Lighting Attenuation**:
   - In [`src/blocks/fishTankCircadian.ts`](file:///e:/code_project/OSS/CatOSSWorks/CatPortfolio/src/blocks/fishTankCircadian.ts), night mode scales `keyIntensity` to `0.22×` and `ambientIntensity` to `0.45×`, while shifting both lights into deep cyan/abyss (`#040a1a`).
   - This removes the directional light needed to reflect authentic texture albedo, making fish look flat and uniform.

2. **Beer-Lambert Fog Red/Green Extinction**:
   - In [`src/fish/shaders/absorption.ts`](file:///e:/code_project/OSS/CatOSSWorks/CatPortfolio/src/fish/shaders/absorption.ts) and [`src/blocks/fishTankTokens.ts`](file:///e:/code_project/OSS/CatOSSWorks/CatPortfolio/src/blocks/fishTankTokens.ts), extinction coefficient `sigma: [0.35, 0.08, 0.02]` aggressively strips red and warm light over distance. Near the seafloor, all warm tones are absorbed before reaching the camera.

3. **Restricted Coral & Flora Color Spectrum**:
   - In [`src/fish/seabedFlora.ts`](file:///e:/code_project/OSS/CatOSSWorks/CatPortfolio/src/fish/seabedFlora.ts), `CORAL_PROP_IDS` are tinted using only `[palette.accent, palette.neon, palette.cyan]`. Under dark mode, these become subdued greens and teals.

4. **Monochromatic Ambient Particles**:
   - Marine snow (`MOTE_CONFIG`) and minnow swarms (`MINNOW_CONFIG`) render with flat single-color points rather than iridescent or multi-chromatic bioluminescence.

5. **High Bloom Luminance Threshold**:
   - In [`src/fish/postprocessing/tankComposer.ts`](file:///e:/code_project/OSS/CatOSSWorks/CatPortfolio/src/fish/postprocessing/tankComposer.ts), `UnrealBloomPass` is configured with `threshold: 0.72` and `strength: 0.42`. This prevents moderately glowing coral polyps or fish accents from producing an ethereal, dreamy undersea glow.

---

## 4. Undersea Game Aesthetic Strategy

To transform the dark scene into a vibrant undersea environment:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   VIBRANT UNDERSEA SCENE ARCHITECTURE                  │
├────────────────────────────────┬───────────────────────────────────────┤
│ Atmospheric Foundation         │ Deep royal indigo base (#08132e)      │
│                                │ Softened Beer-Lambert absorption      │
├────────────────────────────────┼───────────────────────────────────────┤
│ Bioluminescent Reefs           │ Rich palette (Magenta, Violet, Amber) │
│                                │ Glowing coral polyps + tip highlights │
├────────────────────────────────┼───────────────────────────────────────┤
│ Localized Lighting             │ Low-intensity point lights on reefs   │
│                                │ Casting pools of color onto sand bed  │
├────────────────────────────────┼───────────────────────────────────────┤
│ Living Particle Swarms         │ Rainbow bioluminescent motes & snow   │
│                                │ Iridescent gradient on minnow schools │
├────────────────────────────────┼───────────────────────────────────────┤
│ Dreamy Post-Processing         │ UnrealBloom threshold: 0.55           │
│                                │ Bloom strength: 0.65, radius: 0.45    │
└────────────────────────────────┴───────────────────────────────────────┘
```

---

## 5. Proposed Implementation Roadmap

### A. Expand Reef Palette & Emissive Materials
**Target File:** [`src/fish/seabedFlora.ts`](file:///e:/code_project/OSS/CatOSSWorks/CatPortfolio/src/fish/seabedFlora.ts)
- Replace the 3-color palette with a curated multi-spectral reef array:
  ```ts
  export const REEF_BIOLUMINESCENT_PALETTE = [
    0xff2a85, // Electric coral magenta
    0x00f5d4, // Bioluminescent cyan
    0x8a2be2, // Fluorescent blue-violet
    0xffb703, // Warm luminous amber
    0x06d6a0, // Radiant seafoam emerald
    0xf72585, // Deep neon pink
    0x4cc9f0, // Electric sky blue
  ]
  ```
- Configure loaded coral models with `emissive` matched to tint and `emissiveIntensity: 0.5`.

### B. Add Localized Point Lights on Major Coral Formations
**Target File:** [`src/fish/seabedFlora.ts`](file:///e:/code_project/OSS/CatOSSWorks/CatPortfolio/src/fish/seabedFlora.ts)
- Add 2–3 low-cost `THREE.PointLight`s (e.g., magenta and cyan, `distance: 8`, `decay: 2`, `intensity: 0.8`) at key seabed coordinates to cast colored illumination onto the sand dunes.

### C. Multi-Chromatic Marine Snow & Minnow Trails
**Target Files:** [`src/fish/minnowField.ts`](file:///e:/code_project/OSS/CatOSSWorks/CatPortfolio/src/fish/minnowField.ts) & [`src/blocks/fishTankConfig.ts`](file:///e:/code_project/OSS/CatOSSWorks/CatPortfolio/src/blocks/fishTankConfig.ts)
- In `minnowField.ts`, populate `instancedMesh` colors with an iridescent hue gradient along the spline paths.
- In `MOTE_CONFIG`, randomize particle colors across pastel bioluminescent tones.

### D. Refine Night Circadian Lighting & Fog Values
**Target Files:** [`src/blocks/fishTankCircadian.ts`](file:///e:/code_project/OSS/CatOSSWorks/CatPortfolio/src/blocks/fishTankCircadian.ts) & [`src/blocks/fishTankTokens.ts`](file:///e:/code_project/OSS/CatOSSWorks/CatPortfolio/src/blocks/fishTankTokens.ts)
- Adjust the night key multiplier from `0.22` to `0.35` so specimen textures remain readable.
- Set `deep` base tone to rich midnight indigo (`0x08132e`) instead of blackish navy (`0x040a1a`).

### E. Post-Processing Bloom Calibration
**Target File:** [`src/fish/postprocessing/tankComposer.ts`](file:///e:/code_project/OSS/CatOSSWorks/CatPortfolio/src/fish/postprocessing/tankComposer.ts)
- Tune `UnrealBloomPass`:
  ```ts
  bloom = new UnrealBloomPass(
    new THREE.Vector2(width, height),
    0.65, // Strength (up from 0.42)
    0.45, // Dispersion radius (up from 0.35)
    0.55, // Luminance threshold (down from 0.72)
  )
  ```

---

## 6. Verification Checklist

- [x] Initial 3D tank load and asset integrity verified (0 WebGL/shader errors).
- [x] Circadian mode transitions and theme toggles tested via browser tools.
- [x] Specimen locking, background bokeh, and food pellet interaction validated.
- [x] Root causes of dark scene color suppression identified and documented.
- [x] Specific architectural changes and file modifications outlined for implementation.
