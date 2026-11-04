import { test, expect } from "@playwright/test"

// A silent text fallback reads as a broken 3D button (design review P1).
// Reduced motion only changes the default; `?v=tank` is the explicit opt-in.
test.beforeEach(async ({ page }) => {
  await page.route("**/profile-pieces/index.json", (route) => route.fulfill({ json: { pieces: [] } }))
})

test.describe("Tank fallback notice", () => {
  test.skip(({ browserName }) => browserName !== "chromium")
  // Same emulation as pipeline.spec.ts (the `use` option is not applied here).
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
  })

  test("reduced motion explains the text view and offers the tank", async ({ page }) => {
    await page.goto("./")
    const notice = page.getByTestId("tank-fallback-notice")
    await expect(notice).toContainText("reduced-motion")
    // The 3D/Flat pills would do nothing here; the notice's link is the way in.
    await expect(page.getByRole("group", { name: "Tank view" })).toHaveCount(0)
    await notice.getByRole("button", { name: "Open the 3D tank anyway" }).click()
    await expect(page).toHaveURL(/[?&]v=tank/)
    await expect(page.locator('canvas[aria-label="Interactive portfolio fish tank"]')).toBeVisible({ timeout: 20_000 })
  })

  test("an explicit text view shows no notice", async ({ page }) => {
    await page.goto("./?v=text")
    await expect(page.locator("[data-fishtank-flat]")).toBeVisible()
    await expect(page.getByTestId("tank-fallback-notice")).toHaveCount(0)
  })
})
