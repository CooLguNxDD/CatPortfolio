import { test, expect, devices } from "@playwright/test"

const FLAGSHIP_GLBS = ["MantaRay", "GreateWhiteShark", "Clownfish", "GreenTurtle"] as const

test.describe("Fish tank 3D GLB integration", () => {
  test.skip(({ browserName }) => browserName !== "chromium")

  test("desktop high tier loads four flagship GLBs", async ({ page }) => {
    const fishGlbs: string[] = []
    page.on("request", (req) => {
      const url = req.url()
      if (url.includes("/models/fish/") && url.endsWith(".glb")) {
        fishGlbs.push(url)
      }
    })

    await page.goto("./")
    const canvas = page.locator('canvas[aria-label="Interactive portfolio fish tank"]')
    await expect(canvas).toBeVisible({ timeout: 20_000 })
    await expect(canvas).toHaveAttribute("data-tank-tier", "high", { timeout: 15_000 })
    await expect(canvas).toHaveAttribute("data-tank-gltf-ready", "true", { timeout: 30_000 })
    await expect(canvas).toHaveAttribute("data-tank-gltf-heroes", "4")
    await expect(canvas).toHaveAttribute("data-tank-scenery", "gltf")

    const names = fishGlbs.map((u) => u.split("/").pop() ?? "")
    for (const id of FLAGSHIP_GLBS) {
      expect(names.some((n) => n.startsWith(`${id}.glb`))).toBe(true)
    }

    await canvas.screenshot({ path: "test-results/tank-desktop-high.png" })
  })

  test("focus dim keeps GLB heroes mounted", async ({ page }) => {
    await page.goto("./?f=weltel-ai")
    const canvas = page.locator('canvas[aria-label="Interactive portfolio fish tank"]')
    await expect(canvas).toHaveAttribute("data-tank-gltf-ready", "true", { timeout: 30_000 })
    await expect(canvas).toHaveAttribute("data-tank-gltf-heroes", "4")
    await canvas.screenshot({ path: "test-results/tank-focus-weltel-ai.png" })
  })

  test("text view then tank remounts without GLTF console errors", async ({ page }) => {
    const errors: string[] = []
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text())
    })

    await page.goto("./")
    await expect(page.locator('canvas[aria-label="Interactive portfolio fish tank"]')).toHaveAttribute(
      "data-tank-gltf-ready",
      "true",
      { timeout: 30_000 },
    )

    await page.goto("./?v=text")
    await expect(page.getByRole("heading", { name: /Ask Portfolio|Cat/i }).first()).toBeVisible({
      timeout: 15_000,
    })

    await page.goto("./")
    await expect(page.locator('canvas[aria-label="Interactive portfolio fish tank"]')).toHaveAttribute(
      "data-tank-gltf-ready",
      "true",
      { timeout: 30_000 },
    )

    const gltfNoise = errors.filter((t) =>
      /ModelLoader|GLTFLoader|WebGLRenderingContext|context lost|THREE\.WebGLRenderer/i.test(t),
    )
    expect(gltfNoise).toEqual([])
  })
})

test.describe("Fish tank low tier (mobile)", () => {
  test.skip(({ browserName }) => browserName !== "chromium")
  test.use({
    viewport: devices["iPhone 12"].viewport,
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: devices["iPhone 12"].deviceScaleFactor,
  })

  test("does not fetch creature or prop GLBs", async ({ page }) => {
    const glbUrls: string[] = []
    page.on("request", (req) => {
      const url = req.url()
      if (url.endsWith(".glb")) glbUrls.push(url)
    })

    await page.goto("./")
    const canvas = page.locator('canvas[aria-label="Interactive portfolio fish tank"]')
    await expect(canvas).toBeVisible({ timeout: 20_000 })
    await expect(canvas).toHaveAttribute("data-tank-tier", "low")
    await expect(canvas).toHaveAttribute("data-tank-gltf-heroes", "0")
    await expect(canvas).toHaveAttribute("data-tank-scenery", "procedural")
    await expect(canvas).toHaveAttribute("data-tank-gltf-ready", "true")

    expect(glbUrls.filter((u) => u.includes("/models/fish/"))).toEqual([])
    expect(glbUrls.filter((u) => u.includes("/models/props/"))).toEqual([])
    await canvas.screenshot({ path: "test-results/tank-mobile-low.png" })
  })
})
