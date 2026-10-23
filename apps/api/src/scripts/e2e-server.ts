/**
 * API for the end-to-end tests: a throw-away in-memory MongoDB with the default catalogue and
 * one test administrator, so tests never touch your real database. Started by Playwright
 * (playwright.config.ts), which also invents a random administrator password for each run.
 *
 * For tests only: it also serves GET /api/__e2e/emails, so a test can read the "emails" the
 * site would have sent (such as a password-reset link). The real app has no such route.
 */
import { createServer } from 'node:http';
import express from 'express';
import { pino } from 'pino';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app';
import { parseEnv } from '../config/env';
import { connectDatabase, disconnectDatabase, pingDatabase } from '../db/connection';
import { createLogger } from '../lib/logger';
import { createAdminUser } from '../modules/auth/auth.service';
import { useCheapPasswordHashingForTests } from '../modules/auth/password';
import { UserModel } from '../modules/auth/user.model';
import { ensureCatalogueDefaults } from '../modules/catalogue/catalogue.service';
import { createCaptureMailer } from '../services/mailer';

const port = process.env.E2E_API_PORT ?? '4100';
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
if (!adminEmail || !adminPassword) {
  throw new Error(
    'E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD must be set (playwright.config.ts does this).',
  );
}

// Tests sign in and out constantly, often in parallel; cheap hashing keeps them fast.
useCheapPasswordHashingForTests();

const mongo = await MongoMemoryServer.create();
const env = parseEnv({
  NODE_ENV: 'test',
  PORT: port,
  APP_ORIGIN: 'http://localhost:5180',
  MONGODB_URI: mongo.getUri('prajzo-e2e'),
  SESSION_SECRET: 'e2e-session-secret-that-is-long-enough-0123456789',
  CONTACT_RATE_LIMIT_MAX: '100',
  AUTH_RATE_LIMIT_MAX: '100',
});

await connectDatabase(env.MONGODB_URI);
await UserModel.init();
await ensureCatalogueDefaults();
await createAdminUser({ name: 'E2E Admin', email: adminEmail, password: adminPassword });

// Set E2E_LOG=1 to see every request the test server handles (helpful when a test misbehaves).
const logger = process.env.E2E_LOG ? pino({ level: 'info' }) : createLogger(env);
const mailer = createCaptureMailer();
const app = createApp({ env, logger, checkDatabase: () => pingDatabase(), mailer });

const outer = express();
outer.get('/api/__e2e/emails', (req, res) => {
  const to = typeof req.query.to === 'string' ? req.query.to : undefined;
  res.json(mailer.sent.filter((mail) => !to || mail.to === to));
});
outer.use(app);

const server = createServer(outer).listen(env.PORT, () => {
  console.log(`E2E API ready on http://localhost:${env.PORT}`);
});

const stop = () => {
  server.close();
  void disconnectDatabase()
    .then(() => mongo.stop())
    .finally(() => process.exit(0));
};
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
