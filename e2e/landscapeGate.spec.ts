import { test, expect, devices } from "@playwright/test"
import { skipTankTutorial } from "./fixtures/tutorial"

// Portrait phones answer a "best in landscape" gate before any WebGL mounts.
// Desktop projects have no coarse pointer, so the other suites never see it.
const PHONE = {
  viewport: devices["iPhone 13"].viewport,
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: devices["iPhone 13"].deviceScaleFactor,
}
const LANDSCAPE = { width: PHONE.viewport.height, height: PHONE.viewport.width }
const TANK = 'canvas[aria-label="Interactive portfolio fish tank"]'

test.beforeEach(async ({ page }) => {
  await skipTankTutorial(page)
  await page.route("**/profile-pieces/index.json", (route) => route.fulfill({ json: { pieces: [] } }))
})

test.describe("Landscape gate (portrait phone)", () => {
  test.skip(({ browserName }) => browserName !== "chromium")
  test.use(PHONE)

  test("holds the tank: gate shown, no canvas, no three chunk", async ({ page }) => {
    const threeChunks: string[] = []
    page.on("request", (req) => {
      if (/FishTankCanvas|three/i.test(req.url())) threeChunks.push(req.url())
    })
    await page.goto("./")
    const gate = page.getByTestId("landscape-gate")
    await expect(gate).toBeVisible()
    await expect(page.getByRole("dialog", { name: "Best in landscape" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Continue in portrait" })).toBeFocused()
    await page.waitForTimeout(500)
    await expect(page.locator(TANK)).toHaveCount(0)
    expect(threeChunks).toEqual([])
  })

  test("continue in portrait mounts the tank", async ({ page }) => {
    await page.goto("./")
    await page.getByRole("button", { name: "Continue in portrait" }).click()
    await expect(page.getByTestId("landscape-gate")).toHaveCount(0)
    await expect(page.locator(TANK)).toBeVisible({ timeout: 20_000 })
  })

  test("rotating to landscape opens the tank and portrait does not re-gate", async ({ page }) => {
    await page.goto("./")
    await expect(page.getByTestId("landscape-gate")).toBeVisible()
    await page.setViewportSize(LANDSCAPE)
    await expect(page.locator(TANK)).toBeVisible({ timeout: 20_000 })
    await page.setViewportSize(PHONE.viewport)
    await expect(page.getByTestId("landscape-gate")).toHaveCount(0)
    await expect(page.locator(TANK)).toBeVisible()
  })

  test("use text view switches to ?v=text", async ({ page }) => {
    await page.goto("./")
    await page.getByRole("button", { name: "Use text view instead" }).click()
    await expect(page).toHaveURL(/[?&]v=text/)
    await expect(page.getByTestId("landscape-gate")).toHaveCount(0)
    await expect(page.locator("[data-fishtank-flat]")).toBeVisible()
  })
})
