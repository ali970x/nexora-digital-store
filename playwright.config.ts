import {defineConfig, devices} from '@playwright/test';
import {loadEnvConfig} from '@next/env';

loadEnvConfig(process.cwd());

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list'], ['html', {open: 'never', outputFolder: 'artifacts/playwright-report'}]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3100',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: process.env.CI ? 'retain-on-failure' : 'off'
  },
  projects: [
    {
      name: 'chromium',
      use: {...devices['Desktop Chrome'], ...(process.env.CI ? {} : {channel: 'chrome'})}
    }
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npm run dev -- --port 3100',
        url: 'http://127.0.0.1:3100/en/auth/sign-in',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000
      }
});
