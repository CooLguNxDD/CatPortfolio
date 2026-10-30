import { defineConfig, devices } from '@playwright/test';

// Isolate worktree tests from a running portfolio/Docker instance. Never reuse an
// arbitrary server: otherwise new routes can be tested against an older checkout.
const port = process.env.E2E_PORT ?? '11001'
const origin = process.env.E2E_ORIGIN ?? `http://localhost:${port}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // WebGL suites share a physical GPU; unrestricted local workers starve browser timers.
  workers: process.env.CI ? 1 : 2,
  reporter: 'html',
  use: {
    baseURL: `${origin}/CatPortfolio/`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
  webServer: process.env.E2E_ORIGIN
    ? undefined
    : {
        command: `npm run dev -- --port ${port} --strictPort`,
        url: `${origin}/CatPortfolio/`,
        reuseExistingServer: false,
        timeout: 120 * 1000,
      },
});
