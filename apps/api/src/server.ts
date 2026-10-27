import dns from 'node:dns';
import { createServer } from 'node:http';
import { createApp } from './app';
import { ConfigError, loadEnv, type Env } from './config/env';
import {
  connectWithRetry,
  describeError,
  disconnectDatabase,
  pingDatabase,
  watchConnection,
} from './db/connection';
import { installFatalErrorHandlers } from './lib/fatal-errors';
import { createLogger, type Logger } from './lib/logger';
import { ensureCatalogueDefaults } from './modules/catalogue/catalogue.service';
import { createConsoleMailer, createSmtpMailer, type Mailer } from './services/mailer';

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

function createMailer(env: Env, logger: Logger): Mailer {
  if (env.MAIL_TRANSPORT === 'console') {
    if (env.NODE_ENV === 'production') {
      logger.warn('MAIL_TRANSPORT is "console": emails are NOT being sent (docs/ENVIRONMENT.md)');
    }
    return createConsoleMailer(logger, { showBody: env.NODE_ENV === 'development' });
  }
  const mailer = createSmtpMailer(env);
  // A wrong password or a blocked port shows up in the log at once, not at the first email.
  mailer
    .verify()
    .then(() => logger.info({ host: env.SMTP_HOST, user: env.SMTP_USER }, 'Email sending is ready'))
    .catch((error: unknown) => {
      logger.error(
        { host: env.SMTP_HOST, user: env.SMTP_USER, reason: describeError(error) },
        'Email sending is NOT working: check SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASSWORD',
      );
    });
  return mailer;
}

function main(): void {
  const env = readSettings();
  const logger = createLogger(env);
  installFatalErrorHandlers(logger);
  const mailer = createMailer(env, logger);
  const app = createApp({ env, logger, checkDatabase: () => pingDatabase(), mailer });
  const server = createServer(app);
  const stopConnecting = new AbortController();

  server.on('error', (error) => {
    logger.fatal({ err: error }, `Could not start the API on port ${env.PORT}`);
    process.exit(1);
  });
  server.listen(env.PORT, () => {
    logger.info(`API listening on http://localhost:${env.PORT}`);
  });

  if (env.DNS_SERVERS) {
    // Used for the SRV and TXT lookups behind mongodb+srv:// addresses (see DNS_SERVERS in env.ts).
    dns.setServers(env.DNS_SERVERS);
    logger.info(`Using DNS servers ${env.DNS_SERVERS.join(', ')} for database address lookups`);
  }

  const stopWatching = watchConnection(logger);

  void connectWithRetry(env.MONGODB_URI, logger, { signal: stopConnecting.signal })
    .then(async () => {
      if (stopConnecting.signal.aborted) return;
      // A fresh database gets the default service categories and packages.
      const counts = await ensureCatalogueDefaults();
      logger.info(counts, 'Service catalogue ready');
    })
    .catch((error: unknown) => {
      logger.error({ reason: describeError(error) }, 'Could not prepare the service catalogue');
    });

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down');
    stopConnecting.abort();
    stopWatching(); // closing on purpose is not a "lost connection"
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
