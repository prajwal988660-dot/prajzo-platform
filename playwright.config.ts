import { randomUUID } from 'node:crypto';
import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env.CI);
const webPort = 5180;
const apiPort = 4100;
// Locally the installed Google Chrome is used, so no browser download is needed.
const browser = isCI ? {} : { channel: 'chrome' };

// A test administrator for this run only. The password is invented fresh each time and lives
// only in memory (this process, the test workers and the throw-away test server).
process.env.E2E_ADMIN_EMAIL ??= 'e2e-admin@example.com';
process.env.E2E_ADMIN_PASSWORD ??= `${randomUUID()}-Aa1`;

/**
 * End-to-end tests: a real browser against the real web app and API. The API uses a
 * throw-away in-memory database (apps/api/src/scripts/e2e-server.ts), never your own.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  // A little more patience than the 5-second default: a slow machine or a cold first page load
  // should not fail a test that is otherwise right.
  expect: { timeout: 10_000 },
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
      env: {
        E2E_API_PORT: String(apiPort),
        E2E_ADMIN_EMAIL: process.env.E2E_ADMIN_EMAIL,
        E2E_ADMIN_PASSWORD: process.env.E2E_ADMIN_PASSWORD,
        ...(process.env.E2E_LOG ? { E2E_LOG: process.env.E2E_LOG } : {}),
      },
      // Always a fresh server: it holds this run's administrator password.
      reuseExistingServer: false,
      // E2E_LOG=1 shows the test server's request log in the test output.
      stdout: process.env.E2E_LOG ? 'pipe' : 'ignore',
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
