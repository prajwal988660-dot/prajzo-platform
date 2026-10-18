/**
 * API for the end-to-end tests: a throw-away in-memory MongoDB with the default catalogue,
 * so tests never touch your real database. Started by Playwright (playwright.config.ts).
 */
import { createServer } from 'node:http';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app';
import { parseEnv } from '../config/env';
import { connectDatabase, disconnectDatabase, pingDatabase } from '../db/connection';
import { createLogger } from '../lib/logger';
import { ensureCatalogueDefaults } from '../modules/catalogue/catalogue.service';
import { createConsoleMailer } from '../services/mailer';

const port = process.env.E2E_API_PORT ?? '4100';
const mongo = await MongoMemoryServer.create();
const env = parseEnv({
  NODE_ENV: 'test',
  PORT: port,
  APP_ORIGIN: 'http://localhost:5180',
  MONGODB_URI: mongo.getUri('prajzo-e2e'),
  SESSION_SECRET: 'e2e-session-secret-that-is-long-enough-0123456789',
  CONTACT_RATE_LIMIT_MAX: '100',
});

await connectDatabase(env.MONGODB_URI);
await ensureCatalogueDefaults();

const logger = createLogger(env);
const app = createApp({
  env,
  logger,
  checkDatabase: () => pingDatabase(),
  mailer: createConsoleMailer(logger, { showBody: false }),
});
const server = createServer(app).listen(env.PORT, () => {
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
