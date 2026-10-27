/**
 * Shared start and finish for the database scripts (backup, restore, rehearsal): reads
 * apps/api/.env, connects, runs the work, disconnects, and turns any failure into one clear line.
 */
import dns from 'node:dns';
import type { Db } from 'mongodb';
import mongoose from 'mongoose';
import { ConfigError, loadEnv, type Env } from '../config/env';
import { connectDatabase, describeError, disconnectDatabase } from '../db/connection';
import { BackupError } from '../db/backup';

export function runDatabaseScript(title: string, work: (db: Db, env: Env) => Promise<void>): void {
  const run = async () => {
    const env = loadEnv();
    if (env.DNS_SERVERS) dns.setServers(env.DNS_SERVERS);
    await connectDatabase(env.MONGODB_URI);
    try {
      const db = mongoose.connection.db;
      if (!db) throw new Error('Connected, but no database was selected.');
      await work(db, env);
    } finally {
      await disconnectDatabase();
    }
  };
  run().catch((error: unknown) => {
    const reason =
      error instanceof ConfigError || error instanceof BackupError
        ? error.message
        : describeError(error);
    console.error(`\n${title} failed: ${reason}`);
    process.exit(1);
  });
}

/** Reads `--name value` arguments and the on/off `--flag` arguments named in `flagNames`. */
export function readArguments(argv: string[], flagNames: string[] = []) {
  const values = new Map<string, string>();
  const flags = new Set<string>();
  const positional: string[] = [];
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index] ?? '';
    if (!argument.startsWith('--')) {
      positional.push(argument);
      continue;
    }
    const name = argument.slice(2);
    const next = argv[index + 1];
    if (flagNames.includes(name)) {
      flags.add(name);
    } else if (next !== undefined && !next.startsWith('--')) {
      values.set(name, next);
      index += 1;
    } else {
      throw new BackupError(`--${name} needs a value after it.`);
    }
  }
  return { values, flags, positional };
}

const INDIA_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/** India time, in a form that is safe in a folder name, such as 2026-10-27-224301. */
export function folderTimestamp(date = new Date()): string {
  return new Date(date.getTime() + INDIA_OFFSET_MS)
    .toISOString()
    .slice(0, 19)
    .replace('T', '-')
    .replaceAll(':', '');
}
