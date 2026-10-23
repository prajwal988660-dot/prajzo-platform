import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../app';
import { parseEnv, type Env } from '../config/env';
import { connectDatabase, disconnectDatabase, pingDatabase } from '../db/connection';
import { createLogger } from '../lib/logger';
import { useCheapPasswordHashingForTests } from '../modules/auth/password';
import { createCaptureMailer, type Mailer } from '../services/mailer';

export function testEnv(overrides: Record<string, string> = {}): Env {
  return parseEnv({
    NODE_ENV: 'test',
    APP_ORIGIN: 'http://localhost:5173',
    MONGODB_URI: 'mongodb://127.0.0.1:27017/prajzo-test',
    SESSION_SECRET: 'test-session-secret-that-is-long-enough-1234',
    ...overrides,
  });
}

export function testApp(
  options: { env?: Env; checkDatabase?: () => Promise<boolean>; mailer?: Mailer } = {},
): ReturnType<typeof createApp> {
  const env = options.env ?? testEnv();
  return createApp({
    env,
    logger: createLogger({ NODE_ENV: 'test', LOG_LEVEL: 'silent' }),
    checkDatabase: options.checkDatabase ?? (() => pingDatabase()),
    mailer: options.mailer ?? createCaptureMailer(),
  });
}

/** Starts a throw-away MongoDB in memory and connects Mongoose to it. */
export async function startTestDatabase(): Promise<{ stop: () => Promise<void> }> {
  useCheapPasswordHashingForTests();
  const server = await MongoMemoryServer.create();
  await connectDatabase(server.getUri('prajzo-test'));
  // Build every index (such as "one account per email") before the first test runs.
  await Promise.all(mongoose.modelNames().map((name) => mongoose.model(name).init()));
  return {
    stop: async () => {
      await disconnectDatabase();
      await server.stop();
    },
  };
}
