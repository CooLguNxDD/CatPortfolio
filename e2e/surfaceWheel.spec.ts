import { test, expect } from "@playwright/test"
import { skipTankTutorial } from "./fixtures/tutorial"

// Regression (meow-1.2.0): at the surface the canvas wheel handler zoomed and
// stopped propagation anywhere on the canvas, so scrolling never dived. Only a
// wheel over the cat should zoom; open canvas must bubble to the stage dive.
const TANK = 'canvas[aria-label="Interactive portfolio fish tank"]'

test.beforeEach(async ({ page }) => {
  await skipTankTutorial(page)
  await page.route("**/profile-pieces/index.json", (route) => route.fulfill({ json: { pieces: [] } }))
})

test("scrolling down over open canvas at the surface dives", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium")
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto("./?v=tank")
  const canvas = page.locator(TANK)
  await expect(canvas).toBeVisible({ timeout: 20_000 })
  await expect(canvas).toHaveAttribute("data-tank-cat-model", /ready|fallback/, { timeout: 30_000 })
  await expect(page.locator(".ft-stage")).toHaveAttribute("data-fishtank-stage", "surface")

  // Bottom-right corner: open water, clear of the hero card (left) and the cat (centre).
  const box = await canvas.boundingBox()
  if (!box) throw new Error("tank canvas has no box")
  await page.mouse.move(box.x + box.width * 0.93, box.y + box.height * 0.9)
  await page.mouse.wheel(0, 300)

  await expect(page.locator(".ft-stage")).toHaveAttribute("data-fishtank-stage", "tank", { timeout: 15_000 })
})
