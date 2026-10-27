/**
 * After you change the database user's password in MongoDB Atlas, this puts the new one into
 * apps/api/.env (D-061). Run it yourself, or double-click "Change database password.cmd":
 *
 *   npm run db:password -w @prajzo/api
 *
 * The password is hidden as you type or paste it, checked by connecting with it, and only then
 * saved. It never appears on screen or in a log.
 */
import dns from 'node:dns';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { MongoClient } from 'mongodb';
import { ConfigError, loadEnv } from '../config/env';
import { setEnvValues } from '../config/env-file';
import { databaseOf, userOf, withPassword } from '../config/mongodb-uri';
import { describeError } from '../db/connection';
import { askHidden } from './terminal-prompts';

/** Atlas can take a minute to start accepting a new password, so connecting is retried. */
async function canConnect(uri: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  let reason = '';
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000 });
    try {
      await client.connect();
      await client.db(databaseOf(uri) || 'admin').command({ ping: 1 });
      return { ok: true };
    } catch (error) {
      reason = describeError(error);
      if (!/auth/i.test(reason) && !/timed out|ECONN|ENOTFOUND/i.test(reason)) break;
      if (attempt < 6) {
        console.log(`  Not accepted yet (try ${String(attempt)} of 6). Waiting 15 seconds...`);
        await new Promise((resolve) => setTimeout(resolve, 15_000));
      }
    } finally {
      await client.close().catch(() => undefined);
    }
  }
  return { ok: false, reason };
}

async function main(): Promise<void> {
  if (!process.stdin.isTTY) {
    throw new Error(
      'This asks for a password and hides it, so run it in a terminal window ' +
        '(or double-click "Change database password.cmd").',
    );
  }
  const env = loadEnv();
  if (env.DNS_SERVERS) dns.setServers(env.DNS_SERVERS);
  const user = userOf(env.MONGODB_URI);
  if (!user) throw new Error('MONGODB_URI in apps/api/.env has no user name.');

  console.log(
    [
      'Change the database password.',
      '',
      'First, in MongoDB Atlas (cloud.mongodb.com):',
      '  1. Security > Database Access.',
      `  2. Next to "${user}", click Edit, then Edit Password.`,
      '  3. Click "Autogenerate Secure Password", then Copy.',
      '  4. Click Update User.',
      '',
      'Then paste it here: right-click in this window (or Ctrl+V) and press Enter.',
      'Nothing shows while you paste. That is normal.',
      '',
    ].join('\n'),
  );
  const password = (await askHidden('New password: ')).trim();
  if (!password) throw new Error('No password was given. Nothing was changed.');

  const uri = withPassword(env.MONGODB_URI, password);
  console.log('\nConnecting with the new password...');
  const result = await canConnect(uri);
  if (!result.ok) {
    throw new Error(
      `It did not connect (${result.reason}). Nothing was saved. Check you clicked Update User ` +
        'in Atlas and copied the whole password, then run this again.',
    );
  }

  const envFile = path.resolve('.env');
  await writeFile(envFile, setEnvValues(await readFile(envFile, 'utf8'), { MONGODB_URI: uri }));
  console.log(
    [
      'Connected. The new password is saved in apps/api/.env.',
      'Restart the website on this computer (npm run host:local) so it uses it.',
      'The old password no longer works anywhere.',
    ].join('\n'),
  );
}

main().catch((error: unknown) => {
  console.error(
    `\n${error instanceof ConfigError || error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
