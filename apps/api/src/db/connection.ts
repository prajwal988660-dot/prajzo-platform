import { setTimeout as sleep } from 'node:timers/promises';
import mongoose from 'mongoose';
import type { Logger } from '../lib/logger';

// Reject unknown query fields and strip query operators ($gt, $where…) from user input.
mongoose.set('strictQuery', true);
mongoose.set('sanitizeFilter', true);

export async function connectDatabase(uri: string): Promise<void> {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000, appName: 'prajzo-api' });
}

/**
 * Keeps trying to connect until it succeeds or `signal` is aborted, so the API can start (and
 * report "not ready") while the database is unreachable, for example before your IP address
 * is allowed in MongoDB Atlas.
 */
export async function connectWithRetry(
  uri: string,
  logger: Logger,
  { retryDelayMs = 10_000, signal }: { retryDelayMs?: number; signal?: AbortSignal } = {},
): Promise<void> {
  while (!signal?.aborted) {
    try {
      await connectDatabase(uri);
      logger.info('Database connected');
      return;
    } catch (error) {
      logger.error(
        { reason: describeError(error) },
        `Database connection failed; retrying in ${retryDelayMs / 1000}s. ${connectionHint(error)}`,
      );
      try {
        await sleep(retryDelayMs, undefined, { signal });
      } catch {
        return; // aborted while waiting
      }
    }
  }
}

/** True when the database answers a ping within `timeoutMs`. */
export async function pingDatabase(timeoutMs = 2_000): Promise<boolean> {
  const db = mongoose.connection.db;
  if (mongoose.connection.readyState !== mongoose.ConnectionStates.connected || !db) return false;
  const timer = new AbortController();
  try {
    await Promise.race([
      db.command({ ping: 1 }),
      sleep(timeoutMs, undefined, { signal: timer.signal }).then(() => {
        throw new Error('Database ping timed out');
      }),
    ]);
    return true;
  } catch {
    return false;
  } finally {
    timer.abort(); // don't keep the process waiting for the unused timeout
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

/**
 * Logs when an established database connection drops and when it comes back, so the log
 * explains why the site reports "database disconnected". The driver keeps retrying on its own;
 * nothing needs restarting once the cause (usually a changed IP address in Atlas) is fixed.
 * Returns a function that stops the logging (used when the API shuts down on purpose).
 */
export function watchConnection(logger: Logger): () => void {
  const { connection } = mongoose;
  // Failures before the first successful connection are already reported by connectWithRetry.
  let everConnected = false;
  const onConnected = () => {
    everConnected = true;
  };
  const onDisconnected = () => {
    if (everConnected) {
      logger.warn(
        'Database connection lost; retrying automatically. If your internet address changed, ' +
          'add the new one under Atlas → Network Access.',
      );
    }
  };
  const onReconnected = () => logger.info('Database connection restored');
  const onError = (error: unknown) => {
    if (everConnected) {
      logger.error({ reason: describeError(error) }, `Database error. ${connectionHint(error)}`);
    }
  };

  connection.on('connected', onConnected);
  connection.on('disconnected', onDisconnected);
  connection.on('reconnected', onReconnected);
  connection.on('error', onError);
  return () => {
    connection.off('connected', onConnected);
    connection.off('disconnected', onDisconnected);
    connection.off('reconnected', onReconnected);
    connection.off('error', onError);
  };
}

/** A plain-language next step for the most common MongoDB Atlas connection problems. */
export function connectionHint(error: unknown): string {
  const text = describeError(error);
  if (/querySrv|querytxt/i.test(text)) {
    return (
      'This computer could not look up the mongodb+srv:// address (a known Node.js-on-Windows ' +
      'DNS problem). Add DNS_SERVERS=1.1.1.1,8.8.8.8 to apps/api/.env and restart.'
    );
  }
  if (/bad auth|authentication failed/i.test(text)) {
    return (
      'Atlas rejected the username or password in MONGODB_URI. Check the user under ' +
      'Atlas → Database Access, and the password inside the connection string.'
    );
  }
  if (
    /whitelist|ip address|server selection|timed out|ETIMEDOUT|tlsv1 alert|ssl alert/i.test(text)
  ) {
    return (
      'Atlas did not answer. Under Atlas → Network Access, add your current IP address ' +
      '(it can change when your internet connection restarts).'
    );
  }
  return 'Check MONGODB_URI, and in MongoDB Atlas check Network Access and the database user.';
}

/** Error text that is safe to log: credentials inside connection strings are removed. */
export function describeError(error: unknown): string {
  const text = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  // Everything up to the last "@" of the address is removed, so a password that itself
  // contains "@" doesn't leak either.
  return text.replace(/(mongodb(?:\+srv)?:\/\/)\S*@/gi, '$1***@');
}
