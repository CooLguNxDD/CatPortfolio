import { test, expect } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await page.route("**/config.json", (route) => route.fulfill({ json: { octBaseUrl: "same-origin" } }))
  await page.route("**/api/portfolio/public/agent-status*", (route) => route.fulfill({ json: {
    activity: { job_id: "illustration", status: "ready", updated_at: null },
  } }))
})

test("both acts are semantic text with an anonymised bake illustration", async ({ page }) => {
  await page.goto("./pipeline")
  await expect(page.getByTestId("pipeline-act-tailor").getByRole("heading", { name: "Act 1 — Tailor", exact: true })).toBeVisible()
  await expect(page.getByTestId("pipeline-act-serve").getByRole("heading", { name: "Act 2 — Serve", exact: true })).toBeVisible()
  await expect(page.getByTestId("pipeline-act-tailor").locator("ol > li")).toHaveCount(10)
  await expect(page.getByText("Software Developer 1, API platform team", { exact: true })).toBeVisible()
  await expect(page.getByText("3.7 / 5", { exact: true })).toBeVisible()
  await expect(page.getByTestId("pipeline-status")).toHaveText("backend reachable")
  await expect(page.locator('[data-specimen="weltel-ai"]')).toHaveAttribute("data-highlighted", "true")
  await expect(page.locator('[data-specimen="weltel-platform"]')).toHaveAttribute("data-highlighted", "true")
  await expect(page.locator('[data-specimen="weltel-mobile"]')).toHaveAttribute("data-highlighted", "false")
  await expect(page.locator("canvas")).toHaveCount(0)
  await page.screenshot({ path: "test-results/pipeline-desktop.png", fullPage: true })
})

test("reduced motion keeps both text acts readable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("./pipeline")
  await expect(page.getByTestId("pipeline-act-tailor")).toContainText("Ingest")
  await expect(page.getByTestId("pipeline-act-serve")).toContainText("GitHub Pages")
  await expect(page.getByText("A human always reviews and submits", { exact: false })).toBeVisible()
})

test("an aborted status request leaves a complete offline page", async ({ page }) => {
  await page.route("**/api/portfolio/public/agent-status*", (route) => route.abort())
  await page.goto("./pipeline")
  await expect(page.getByTestId("pipeline-status")).toHaveText("offline (snapshot)")
  await expect(page.getByTestId("pipeline-status")).toHaveAttribute("aria-busy", "false")
  await expect(page.getByTestId("pipeline-act-tailor")).toBeVisible()
  await expect(page.getByTestId("pipeline-act-serve")).toBeVisible()
})

for (const failure of ["null", "http", "timeout"]) {
  test(`status ${failure} degrades to snapshot`, async ({ page }) => {
    await page.route("**/api/portfolio/public/agent-status*", async (route) => {
      if (failure === "timeout") return // hold until the fetch's bounded timeout aborts
      await route.fulfill(failure === "http" ? { status: 503, body: "unavailable" } : { json: { activity: null } })
    })
    await page.goto("./pipeline")
    // A pending probe is not yet a verdict: the held request reads as checking until it times out.
    if (failure === "timeout") await expect(page.getByTestId("pipeline-status")).toHaveText("checking backend")
    await expect(page.getByTestId("pipeline-status")).toHaveText("offline (snapshot)")
    await expect(page.getByTestId("pipeline-status")).toHaveAttribute("aria-busy", "false")
    await expect(page.getByTestId("pipeline-act-serve")).toBeVisible()
  })
}

test("nav and text-view entry links open pipeline without losing a demo session", async ({ page }) => {
  await page.route("**/api/portfolio/public/layout**", (route) => route.abort())
  await page.goto("./?v=text&j=example_abcdefghij")
  const label = "How this portfolio tailors itself"
  await page.getByRole("navigation", { name: "Portfolio" }).getByRole("link", { name: label }).click()
  await expect(page).toHaveURL(/\/pipeline(?:\?|$)/)
  await expect(page.getByTestId("pipeline-act-tailor")).toBeVisible()
  await page.goto("./?v=text&j=example_abcdefghij")
  await page.getByTestId("pipeline-text-link").click()
  await expect(page).toHaveURL(/\/pipeline(?:\?|$)/)
  await expect(page.getByTestId("pipeline-act-serve")).toBeVisible()
})

test("rendered copy and resource links reveal no private network details", async ({ page }) => {
  await page.goto("./pipeline")
  await expect(page.getByTestId("pipeline-act-tailor")).toBeVisible()
  const rendered = await page.evaluate(() => ({
    text: document.body.innerText,
    // Raw attributes, not resolved DOM properties: the dev server origin is not published content.
    links: [...document.querySelectorAll("[href], [src]")].flatMap((el) => {
      let href = el.getAttribute("href") ?? ""
      // stampAtsMeta deliberately derives this one URL from the current browser origin.
      // Verify that invariant, then scan its authored path (not the test harness origin).
      if (el.matches('link[rel="canonical"]') && href === new URL("?v=text", `${location.origin}/CatPortfolio/`).href) {
        href = new URL(href).pathname + new URL(href).search
      }
      return [href, el.getAttribute("src") ?? ""]
    }),
  }))
  const text = [rendered.text, ...rendered.links].join("\n")
  expect(text).not.toMatch(/\b(?:\d{1,3}\.){3}\d{1,3}\b/)
  expect(text).not.toMatch(/\b[a-z\d.-]+:\d{2,5}\b/i)
  const allowedHosts = ["github.com", "github.io", "www.w3.org"]
  // URL origins: every scheme-anchored host must be allowlisted.
  for (const match of text.matchAll(/(?:https?:)?\/\/([^\s/:"'<>?#]+)/gi)) {
    expect(allowedHosts, `rendered URL host ${match[1]}`).toContain(match[1].toLowerCase())
  }
  // Bare hostnames too (not merely URL origins): any dotted name ending in a common
  // public or private-network suffix must be allowlisted.
  const bareHost = /\b(?:[a-z\d](?:[a-z\d-]*[a-z\d])?\.)+(?:com|net|org|io|dev|app|ai|co|cloud|me|xyz|site|internal|local|lan|home|arpa)\b/gi
  const bareHosts = [...text.matchAll(bareHost)].map((match) => match[0].toLowerCase())
  expect(bareHosts.filter((host) => !allowedHosts.includes(host))).toEqual([])
})
