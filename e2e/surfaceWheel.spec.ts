import { test, expect } from "@playwright/test"
import { skipTankTutorial } from "./fixtures/tutorial"
import { swipeUp } from "./fixtures/swipe"

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

// Phone landscape (~300px of stage under the header): the hero swaps its
// button row for a swipe hint, and a swipe up anywhere on the stage dives.
test.describe("short touch screen", () => {
  test.use({ viewport: { width: 762, height: 352 }, hasTouch: true, isMobile: true })

  test("shows the swipe hint instead of the buttons and dives on a swipe up", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium")
    await page.goto("./?v=tank")
    await expect(page.locator(TANK)).toBeVisible({ timeout: 20_000 })
    await expect(page.locator(".ft-stage")).toHaveAttribute("data-fishtank-stage", "surface")

    const card = page.locator(".ft-hero-card")
    await expect(card.locator(".ft-swipe-hint")).toBeVisible()
    // Visually hidden but still in the accessibility tree for screen readers.
    const cta = page.getByRole("button", { name: /Dive into the tank/ })
    await expect(cta).toHaveCount(1)
    expect((await card.locator(".ft-row").boundingBox())?.height ?? 0).toBeLessThanOrEqual(1)
    const box = await card.boundingBox()
    expect(box && box.y + box.height).toBeLessThanOrEqual(352)

    await swipeUp(card)
    await expect(page.locator(".ft-stage")).toHaveAttribute("data-fishtank-stage", "tank", { timeout: 15_000 })
  })
})
