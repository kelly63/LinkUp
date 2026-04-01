import { defineConfig } from '@playwright/test';
import path from 'path';

// Use the headless shell binary (supports headless mode without --headless=old)
const CHROMIUM_HEADLESS_SHELL = path.join(
  process.env.HOME || '/root',
  '.cache/ms-playwright/chromium_headless_shell-1194/chrome-linux/headless_shell'
);

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  workers: '100%',
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    viewport: { width: 393, height: 852 },
    launchOptions: {
      // In CI, Playwright manages its own browser; locally use the pre-installed headless shell.
      executablePath: process.env.CI ? undefined : CHROMIUM_HEADLESS_SHELL,
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
