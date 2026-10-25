/**
 * Runs the real production build the way a host would, for the checks in e2e-production/.
 *
 * It starts a throw-away in-memory MongoDB with one test administrator, then runs the built
 * server (apps/api/dist/server.js) with NODE_ENV=production and serves the built web app
 * (apps/web/dist). Nothing here uses the development server, the test-only "emails" route or
 * your own database. Build first (npm run build); Playwright does the rest
 * (playwright.production.config.ts).
 *
 * The built server believes it sits behind a host's proxy that handles https (TRUST_PROXY), as
 * it will on the real host, so the tests send `X-Forwarded-Proto: https`. Set
 * PRODUCTION_CHECK_STAGING_PASSWORD to run it the way the staging site runs, behind a password.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../db/connection';
import { createAdminUser } from '../modules/auth/auth.service';
import { useCheapPasswordHashingForTests } from '../modules/auth/password';

const here = path.dirname(fileURLToPath(import.meta.url));
const serverFile = path.resolve(here, '../../dist/server.js');
const webDist = path.resolve(here, '../../../web/dist');

const port = process.env.PRODUCTION_CHECK_PORT ?? '4301';
const stagingPassword = process.env.PRODUCTION_CHECK_STAGING_PASSWORD ?? '';
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;

if (!adminEmail || !adminPassword) {
  throw new Error(
    'E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD must be set (the Playwright config does).',
  );
}
if (!existsSync(serverFile) || !existsSync(path.join(webDist, 'index.html'))) {
  throw new Error('The production build was not found. Run "npm run build" first.');
}

// Tests sign in and out constantly; cheap hashing keeps them fast. Hashes made either way verify
// the same, because each records its own settings.
useCheapPasswordHashingForTests();

const mongo = await MongoMemoryServer.create();
const uri = mongo.getUri('prajzo-production-check');

// The built server prepares the service catalogue itself; only the administrator is made here.
await connectDatabase(uri);
await Promise.all(mongoose.modelNames().map((name) => mongoose.model(name).init()));
await createAdminUser({
  name: 'Production Check Admin',
  email: adminEmail,
  password: adminPassword,
});
await disconnectDatabase();

const server = spawn(process.execPath, [serverFile], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: port,
    // The public address is https on a real host; the tests reach the server over localhost.
    APP_ORIGIN: 'https://prajzo.test',
    TRUST_PROXY: 'true',
    SERVE_WEB_APP: 'true',
    WEB_DIST_DIR: webDist,
    MONGODB_URI: uri,
    SESSION_SECRET: 'production-check-session-secret-that-is-long-enough-0123456789',
    STAGING_USER: 'preview',
    STAGING_PASSWORD: stagingPassword,
    LOG_LEVEL: 'warn',
    // Many sign-ins in a row are normal here.
    AUTH_RATE_LIMIT_MAX: '1000',
    CONTACT_RATE_LIMIT_MAX: '1000',
    PROJECT_REQUEST_RATE_LIMIT_MAX: '1000',
    PROJECT_ACTION_RATE_LIMIT_MAX: '10000',
    API_RATE_LIMIT_MAX: '100000',
    ADMIN_RATE_LIMIT_MAX: '100000',
  },
});

// Say so only when the server answers "ready", which includes its database. Playwright waits for it.
const basicAuth = stagingPassword
  ? { Authorization: `Basic ${Buffer.from(`preview:${stagingPassword}`).toString('base64')}` }
  : undefined;
const waitingSince = Date.now();
for (;;) {
  try {
    const answer = await fetch(`http://127.0.0.1:${port}/api/health/ready`, { headers: basicAuth });
    if (answer.ok) break;
  } catch {
    // not listening yet
  }
  if (Date.now() - waitingSince > 60_000) {
    server.kill();
    throw new Error('The production build did not become ready within a minute.');
  }
  await new Promise((resolve) => setTimeout(resolve, 200));
}
console.log(`Production check server ready on port ${port}`);

const stop = (signal: NodeJS.Signals) => {
  server.kill(signal);
};
process.once('SIGINT', () => stop('SIGINT'));
process.once('SIGTERM', () => stop('SIGTERM'));

server.once('exit', (code) => {
  void mongo.stop().finally(() => process.exit(code ?? 0));
});
