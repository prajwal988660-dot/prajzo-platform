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
        `Database connection failed; retrying in ${retryDelayMs / 1000}s. Check MONGODB_URI, ` +
          'and in MongoDB Atlas check Network Access (your IP address) and the database user.',
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

/** Error text that is safe to log: credentials inside connection strings are removed. */
export function describeError(error: unknown): string {
  const text = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return text.replace(/(mongodb(?:\+srv)?:\/\/)[^@/\s]+@/gi, '$1***@');
}
