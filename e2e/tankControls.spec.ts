import { test, expect, devices } from "@playwright/test"
import { skipTankTutorial } from "./fixtures/tutorial"

// Underwater bar (review v2): Browse projects · Ask · Controls, with scene
// toggles in one Controls panel and a compact timeline.
const TANK = 'canvas[aria-label="Interactive portfolio fish tank"]'

/** Dive and wait until the submerged HUD has settled (the bar slides in with the dive). */
async function dive(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: /Dive into the tank/ }).click()
  await expect(page.locator(".ft-stage")).toHaveAttribute("data-fishtank-stage", "tank", { timeout: 30_000 })
  await expect(page.locator(".ft-scene--tank")).toHaveAttribute("data-off", "false")
  await page.waitForTimeout(1500)
}

test.beforeEach(async ({ page }) => {
  await skipTankTutorial(page)
  await page.route("**/profile-pieces/index.json", (route) => route.fulfill({ json: { pieces: [] } }))
})

test.describe("Tank controls (phone)", () => {
  test.skip(({ browserName }) => browserName !== "chromium")
  test.use({
    viewport: devices["iPhone 13"].viewport,
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: devices["iPhone 13"].deviceScaleFactor,
  })

  test("three-button bar, controls sheet, sonar off by default, browse opens the index", async ({ page }) => {
    await page.goto("./")
    await page.getByRole("button", { name: "Continue in portrait" }).click()
    await expect(page.locator(TANK)).toBeVisible({ timeout: 20_000 })
    await dive(page)

    const bar = page.getByRole("toolbar", { name: "Aquarium controls" })
    await expect(bar.getByRole("button", { name: "Browse projects" })).toBeVisible()
    await expect(bar.getByRole("button", { name: "Ask" })).toBeVisible()
    const controlsBtn = bar.getByRole("button", { name: "Controls" })
    await expect(controlsBtn).toBeVisible()
    // Search + filters are not in the phone bar (they live in Browse).
    await expect(bar.getByRole("searchbox")).toBeHidden()

    await controlsBtn.click()
    const panel = page.getByRole("dialog", { name: "Scene controls" })
    await expect(panel).toBeVisible()
    await expect(controlsBtn).toHaveAttribute("aria-expanded", "true")
    // Phones start with sonar hidden; one tap shows it.
    const sonar = panel.getByRole("button", { name: "Hidden" })
    await expect(sonar).toHaveAttribute("aria-pressed", "false")
    await sonar.click()
    await expect(panel.getByRole("button", { name: "Visible" })).toHaveAttribute("aria-pressed", "true")
    await expect(panel.getByText("Pinch")).toBeVisible()
    await expect(panel.getByRole("group", { name: "Dive by year" })).toBeVisible()

    await page.keyboard.press("Escape")
    await expect(panel).toHaveCount(0)

    await bar.getByRole("button", { name: "Browse projects" }).click()
    await expect(page.locator("[data-fishtank-flat]")).toBeVisible()
  })

  test("opening Ask closes the controls panel", async ({ page }) => {
    await page.goto("./")
    await page.getByRole("button", { name: "Continue in portrait" }).click()
    await expect(page.locator(TANK)).toBeVisible({ timeout: 20_000 })
    await dive(page)
    const bar = page.getByRole("toolbar", { name: "Aquarium controls" })
    await bar.getByRole("button", { name: "Controls" }).click()
    await expect(page.getByTestId("scene-controls")).toBeVisible()
    await bar.getByRole("button", { name: "Ask" }).click()
    await expect(page.getByTestId("scene-controls")).toHaveCount(0)
    await expect(page.getByRole("complementary", { name: "Ask Agent" })).toBeVisible()
  })
})

test.describe("Tank controls (desktop)", () => {
  test.skip(({ browserName }) => browserName !== "chromium")

  test("compact timeline chips and a controls panel", async ({ page }) => {
    // High tier loads GLB heroes; give slow (software-GL) runners headroom.
    test.setTimeout(120_000)
    await page.goto("./")
    await expect(page.locator(TANK)).toBeVisible({ timeout: 20_000 })
    await dive(page)
    const timeline = page.locator(".ft-bathymetry")
    await expect(timeline).toBeVisible()
    await expect(timeline.getByRole("button", { name: "All years" })).toHaveAttribute("aria-pressed", "true")
    // Compact strip: one row, not a tall rail.
    const box = await timeline.boundingBox()
    expect(box!.height).toBeLessThan(60)

    await page.getByRole("toolbar", { name: "Aquarium controls" }).getByRole("button", { name: "Controls" }).click()
    const panel = page.getByRole("dialog", { name: "Scene controls" })
    await expect(panel).toBeVisible()
    await expect(panel.getByText("Scroll")).toBeVisible()
  })
})
