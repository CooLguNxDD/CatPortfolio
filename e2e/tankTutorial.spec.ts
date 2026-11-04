import { test, expect, devices } from "@playwright/test"

// First-run tank tour on the reusable ScrollCards deck.
// Phone landscape: no landscape gate, low tier (fast), touch wording.
const TANK = 'canvas[aria-label="Interactive portfolio fish tank"]'

test.beforeEach(async ({ page }) => {
  await page.route("**/profile-pieces/index.json", (route) => route.fulfill({ json: { pieces: [] } }))
})

test.describe("Tank tutorial", () => {
  test.skip(({ browserName }) => browserName !== "chromium")
  test.use({
    viewport: { width: devices["iPhone 13"].viewport.height, height: devices["iPhone 13"].viewport.width },
    hasTouch: true,
    isMobile: true,
  })

  test("opens on first visit, steps through cards, and stays closed after finishing", async ({ page }) => {
    await page.goto("./")
    const tour = page.getByRole("dialog", { name: "Tank tutorial" })
    await expect(tour).toBeVisible({ timeout: 20_000 })
    await expect(tour.getByRole("group", { name: /^1 of 4: Every fish is a project/ })).toBeVisible()

    await tour.getByRole("button", { name: "Next" }).click()
    await expect(tour.getByRole("button", { name: /Go to card 2/ })).toHaveAttribute("aria-current", "step")
    // Touch wording.
    await expect(tour.getByRole("group", { name: /^2 of 4: Dive in/ })).toContainText("swipe up")

    await tour.getByRole("button", { name: /Go to card 4/ }).click()
    await expect(tour.getByRole("button", { name: "Start exploring" })).toBeVisible()
    await tour.getByRole("button", { name: "Start exploring" }).click()
    await expect(page.getByTestId("tank-tutorial")).toHaveCount(0)

    await page.reload()
    await expect(page.locator(TANK)).toBeVisible({ timeout: 20_000 })
    await page.waitForTimeout(500)
    await expect(page.getByTestId("tank-tutorial")).toHaveCount(0)
  })

  test("Escape closes it and Controls → Show tutorial brings it back", async ({ page }) => {
    await page.goto("./")
    await expect(page.getByTestId("tank-tutorial")).toBeVisible({ timeout: 20_000 })
    await page.keyboard.press("Escape")
    await expect(page.getByTestId("tank-tutorial")).toHaveCount(0)

    await page.getByRole("button", { name: /Dive into the tank/ }).click()
    await expect(page.locator(".ft-stage")).toHaveAttribute("data-fishtank-stage", "tank", { timeout: 30_000 })
    await page.waitForTimeout(1500)
    await page.getByRole("toolbar", { name: "Aquarium controls" }).getByRole("button", { name: "Controls" }).click()
    await page.getByRole("dialog", { name: "Scene controls" }).getByRole("button", { name: "Show tutorial" }).click()

    await expect(page.getByTestId("scene-controls")).toHaveCount(0)
    const tour = page.getByRole("dialog", { name: "Tank tutorial" })
    await expect(tour).toBeVisible()
    await expect(tour.getByRole("button", { name: /Go to card 1/ })).toHaveAttribute("aria-current", "step")
  })

  test("a ?f= deep link skips the tour", async ({ page }) => {
    await page.goto("./?f=weltel-ai")
    await expect(page.locator(TANK)).toBeVisible({ timeout: 20_000 })
    await page.waitForTimeout(500)
    await expect(page.getByTestId("tank-tutorial")).toHaveCount(0)
  })
})
