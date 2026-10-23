/**
 * Creates an administrator account (or sets a new password for one) in the database named in
 * apps/api/.env. Run it yourself, in your own terminal:
 *
 *   npm run admin:create -w @prajzo/api
 *
 * It asks for the details and hides the password as you type it.
 */
import dns from 'node:dns';
import readline from 'node:readline';
import { adminSetup, type Prompts } from '../modules/auth/admin-setup';
import { ConfigError, loadEnv } from '../config/env';
import { connectDatabase, describeError, disconnectDatabase } from '../db/connection';

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve, reject) => {
    rl.once('close', () => reject(new Error('No answer was given. Nothing was changed.')));
    rl.question(question, (answer) => {
      rl.removeAllListeners('close');
      rl.close();
      resolve(answer);
    });
  });
}

/** Reads a line without echoing it (works by switching the terminal to raw mode). */
function askHidden(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const { stdin, stdout } = process;
    if (!stdin.isTTY) {
      reject(
        new Error('This command must be run in a terminal window, so it can hide the password.'),
      );
      return;
    }
    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let value = '';

    const finish = () => {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write('\n');
      resolve(value);
    };
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === '\r' || char === '\n') {
          finish();
          return;
        }
        if (char === '\u0003') {
          // Ctrl+C
          stdin.setRawMode(false);
          stdout.write('\nCancelled. Nothing was changed.\n');
          process.exit(130);
        }
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1);
        else if (char >= ' ') value += char;
      }
    };
    stdin.on('data', onData);
  });
}

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
