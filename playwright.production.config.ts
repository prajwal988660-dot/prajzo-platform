import { randomUUID } from 'node:crypto';
import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env.CI);
// Locally the installed Google Chrome is used, so no browser download is needed.
const browser = isCI ? {} : { channel: 'chrome' };

const stagingPort = 4301;
const livePort = 4302;

// Invented fresh for every run, kept only in memory (this process, the test workers and the two
// throw-away servers).
process.env.PRODUCTION_CHECK_STAGING_PASSWORD ??= randomUUID();
process.env.E2E_ADMIN_EMAIL ??= 'production-check-admin@example.com';
process.env.E2E_ADMIN_PASSWORD ??= `${randomUUID()}-Aa1`;

/**
 * Checks of the real production build, in a real browser: the built server (apps/api/dist) serving
 * the built web app (apps/web/dist) with NODE_ENV=production, never the development servers.
 * Two copies run side by side, as the two kinds of site will in Phase 7:
 *
 * - "staging": behind the staging password (D-037)
 * - "live": open to everyone
 *
 * Build first: `npm run test:production` does that for you.
 */
function serverFor(port: number, password: string) {
  return {
    command: 'npm run production-check:server -w @prajzo/api',
    wait: { stdout: /Production check server ready on port/ },
    env: {
      PRODUCTION_CHECK_PORT: String(port),
      PRODUCTION_CHECK_STAGING_PASSWORD: password,
      E2E_ADMIN_EMAIL: process.env.E2E_ADMIN_EMAIL ?? '',
      E2E_ADMIN_PASSWORD: process.env.E2E_ADMIN_PASSWORD ?? '',
    },
    stdout: 'pipe' as const,
    reuseExistingServer: false,
    timeout: 180_000,
  };
}

// The tests act as the host's proxy would: it handles https, says so to the server, and passes on
// the address of the visitor (here an address from the range reserved for documentation).
const behindProxy = { 'X-Forwarded-Proto': 'https', 'X-Forwarded-For': '198.51.100.7' };

export default defineConfig({
  testDir: 'e2e-production',
  fullyParallel: false,
  workers: 1,
  expect: { timeout: 10_000 },
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { trace: 'retain-on-failure' },
  projects: [
    {
      name: 'staging',
      testMatch: ['gate', 'build', 'pages', 'protection'].map((name) => `**/${name}.spec.ts`),
      use: {
        ...devices['Desktop Chrome'],
        ...browser,
        baseURL: `http://localhost:${stagingPort}`,
        httpCredentials: {
          username: 'preview',
          password: process.env.PRODUCTION_CHECK_STAGING_PASSWORD,
        },
        extraHTTPHeaders: behindProxy,
      },
    },
    {
      name: 'live',
      testMatch: ['build', 'headers', 'cookies', 'pages', 'protection', 'seo', 'performance'].map(
        (name) => `**/${name}.spec.ts`,
      ),
      use: {
        ...devices['Desktop Chrome'],
        ...browser,
        baseURL: `http://localhost:${livePort}`,
        extraHTTPHeaders: behindProxy,
      },
    },
  ],
  webServer: [
    serverFor(stagingPort, process.env.PRODUCTION_CHECK_STAGING_PASSWORD),
    serverFor(livePort, ''),
  ],
});
