import { defineConfig, devices } from '@playwright/test';

const origin = process.env.E2E_ORIGIN ?? 'http://localhost:11000'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
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
        command: 'npm run dev',
        url: 'http://localhost:11000/CatPortfolio/',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
      },
});
