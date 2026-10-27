/**
 * Creates an administrator account (or sets a new password for one) in the database named in
 * apps/api/.env. Run it yourself, in your own terminal:
 *
 *   npm run admin:create -w @prajzo/api
 *
 * It asks for the details and hides the password as you type it.
 */
import dns from 'node:dns';
import { adminSetup, type Prompts } from '../modules/auth/admin-setup';
import { ConfigError, loadEnv } from '../config/env';
import { connectDatabase, describeError, disconnectDatabase } from '../db/connection';
import { ask, askHidden } from './terminal-prompts';

async function main(): Promise<void> {
  if (!process.stdin.isTTY) {
    throw new Error(
      'This command asks you questions and hides the password you type, so run it yourself in a ' +
        'terminal window (not from a script or a pipe).',
    );
  }
  const env = loadEnv();
  if (env.NODE_ENV === 'production') {
    // On a live server, run this deliberately: it changes who can sign in as an administrator.
    console.log('Running against the PRODUCTION settings.');
  }
  if (env.DNS_SERVERS) dns.setServers(env.DNS_SERVERS);
  const prompts: Prompts = { ask, askHidden, say: (line) => console.log(line) };

  console.log('Create an administrator, or reset an administrator password.\n');
  await connectDatabase(env.MONGODB_URI);
  try {
    const result = await adminSetup(prompts);
    if (result === 'cancelled') process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof ConfigError ? error.message : `\n${describeError(error)}`);
  process.exit(1);
});
