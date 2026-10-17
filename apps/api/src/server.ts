import { createServer } from 'node:http';
import { createApp } from './app';
import { ConfigError, loadEnv, type Env } from './config/env';
import { connectWithRetry, disconnectDatabase, pingDatabase } from './db/connection';
import { createLogger } from './lib/logger';

function readSettings(): Env {
  try {
    return loadEnv();
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(
        `\nThe Prajzo API cannot start.\n${error.message}\n\n` +
          'Fix apps/api/.env (copy apps/api/.env.example if it does not exist).\n' +
          'Every setting is explained in docs/ENVIRONMENT.md.\n',
      );
      process.exit(1);
    }
    throw error;
  }
}

function main(): void {
  const env = readSettings();
  const logger = createLogger(env);
  const app = createApp({ env, logger, checkDatabase: () => pingDatabase() });
  const server = createServer(app);
  const stopConnecting = new AbortController();

  server.on('error', (error) => {
    logger.fatal({ err: error }, `Could not start the API on port ${env.PORT}`);
    process.exit(1);
  });
  server.listen(env.PORT, () => {
    logger.info(`API listening on http://localhost:${env.PORT}`);
  });

  void connectWithRetry(env.MONGODB_URI, logger, { signal: stopConnecting.signal });

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down');
    stopConnecting.abort();
    server.close(() => {
      disconnectDatabase()
        .catch((error: unknown) => logger.error({ err: error }, 'Error while closing the database'))
        .finally(() => process.exit(0));
    });
    // Don't hang forever on open connections.
    setTimeout(() => process.exit(0), 10_000).unref();
  };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

main();
