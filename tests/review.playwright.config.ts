import { defineConfig } from '@playwright/test'
import { chromiumLaunchOptions } from 'deepspace/testing'
export default defineConfig({
  testDir: '.',
  testMatch: 'collab.spec.ts',
  grep: /yearbook workflow/,
  timeout: 120_000,
  workers: 1,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5188',
    headless: true,
    launchOptions: chromiumLaunchOptions(),
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node tests/serve-review.mjs',
    cwd: '..',
    url: 'http://localhost:5188/api/auth/ok',
    timeout: 60_000,
    reuseExistingServer: false,
  },
})
