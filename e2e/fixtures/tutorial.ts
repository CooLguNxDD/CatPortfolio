import { type Page } from "@playwright/test"

/**
 * Mark the first-run tank tutorial as seen before the app boots, so suites
 * that exercise other tank features aren't blocked by its modal. The
 * tutorial itself is covered in tankTutorial.spec.ts.
 */
export async function skipTankTutorial(page: Page) {
  await page.addInitScript(() => {
    try {
      const key = "cat-portfolio-preferences"
      const raw = window.localStorage.getItem(key)
      const blob = raw ? JSON.parse(raw) : { state: {}, version: 1 }
      blob.state = { ...(blob.state ?? {}), tankTutorialSeen: true }
      blob.version = blob.version ?? 1
      window.localStorage.setItem(key, JSON.stringify(blob))
    } catch {
      /* storage blocked: the test will see the tutorial */
    }
  })
}
