import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env.CI);
const webPort = 5180;
const apiPort = 4100;
// Locally the installed Google Chrome is used, so no browser download is needed.
const browser = isCI ? {} : { channel: 'chrome' };

/**
 * End-to-end tests: a real browser against the real web app and API. The API uses a
 * throw-away in-memory database (apps/api/src/scripts/e2e-server.ts), never your own.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${webPort}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, ...browser },
    },
    { name: 'mobile', use: { ...devices['Pixel 7'], ...browser } },
  ],
  webServer: [
    {
      command: 'npm run e2e:server -w @prajzo/api',
      url: `http://localhost:${apiPort}/api/health/ready`,
      env: { E2E_API_PORT: String(apiPort) },
      reuseExistingServer: !isCI,
      timeout: 120_000,
    },
    {
      command: `npm run dev -w @prajzo/web -- --port ${webPort}`,
      url: `http://localhost:${webPort}`,
      env: { VITE_API_PROXY_TARGET: `http://localhost:${apiPort}` },
      reuseExistingServer: !isCI,
      timeout: 120_000,
    },
  ],
});
