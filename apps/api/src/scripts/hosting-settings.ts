/**
 * Writes the settings for the website on Hostinger (D-065) into a file you paste into the web
 * app's "Environment variables", so no secret has to be typed or sent anywhere else. The file is
 * plain KEY=value lines, which suits any host; the names below are kept for now:
 *
 *   npm run hosting:settings -w @prajzo/api -- staging   -> apps/api/.env.render-staging
 *   npm run hosting:settings -w @prajzo/api -- live      -> apps/api/.env.render-live
 *
 * Or double-click "Prepare staging settings.cmd" / "Prepare live settings.cmd".
 *
 * Each site gets its own database on the same Atlas cluster (prajzo-staging, prajzo-live) and its
 * own new session secret. Staging also gets a new password for the whole site. Email settings are
 * copied from apps/api/.env if real sending is set up there. The files are ignored by git.
 */
import { randomBytes, randomInt } from 'node:crypto';
import { access, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { siteContact } from '@prajzo/shared';
import { ConfigError, loadEnv } from '../config/env';
import { quoteEnvValue } from '../config/env-file';
import { withDatabase } from '../config/mongodb-uri';
import { readArguments } from './db-script';

export const sites = {
  staging: { origin: 'https://staging.prajzo.com', database: 'prajzo-staging' },
  live: { origin: 'https://prajzo.com', database: 'prajzo-live' },
} as const;

export type SiteName = keyof typeof sites;

/** A password people can read and type: 4 groups of 5 letters and digits, no look-alikes. */
export function readablePassword(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const group = () =>
    Array.from({ length: 5 }, () => alphabet[randomInt(alphabet.length)]).join('');
  return [group(), group(), group(), group()].join('-');
}

/** Render's box takes plain KEY=value lines; values that need it are quoted. */
function line(name: string, value: string): string {
  return /^[\w@%:/.?&=+,-]*$/.test(value) ? `${name}=${value}` : `${name}=${quoteEnvValue(value)}`;
}

export function hostingSettings(
  site: SiteName,
  dev: {
    MONGODB_URI: string;
    MAIL_TRANSPORT: string;
    SMTP_HOST?: string | undefined;
    SMTP_PORT: number;
    SMTP_USER?: string | undefined;
    SMTP_PASSWORD?: string | undefined;
  },
): { text: string; stagingPassword?: string; sendsEmail: boolean } {
  const { origin, database } = sites[site];
  const values: [string, string][] = [
    ['NODE_ENV', 'production'],
    ['APP_ORIGIN', origin],
    ['MONGODB_URI', withDatabase(dev.MONGODB_URI, database)],
    ['SESSION_SECRET', randomBytes(48).toString('base64url')],
    // The host puts a proxy in front of the app, which says who the visitor really is.
    ['TRUST_PROXY', 'true'],
    ['ADMIN_NOTIFY_EMAIL', siteContact.email],
  ];
  let stagingPassword: string | undefined;
  if (site === 'staging') {
    stagingPassword = readablePassword();
    values.push(['STAGING_USER', 'preview'], ['STAGING_PASSWORD', stagingPassword]);
  }
  const sendsEmail = dev.MAIL_TRANSPORT === 'smtp' && Boolean(dev.SMTP_PASSWORD);
  if (sendsEmail) {
    values.push(
      ['MAIL_TRANSPORT', 'smtp'],
      ['SMTP_HOST', dev.SMTP_HOST ?? ''],
      ['SMTP_PORT', String(dev.SMTP_PORT)],
      ['SMTP_USER', dev.SMTP_USER ?? ''],
      ['SMTP_PASSWORD', dev.SMTP_PASSWORD ?? ''],
    );
  }
  const text = values.map(([name, value]) => line(name, value)).join('\n') + '\n';
  return { text, ...(stagingPassword ? { stagingPassword } : {}), sendsEmail };
}

async function main(): Promise<void> {
  const { positional, flags } = readArguments(process.argv.slice(2), ['replace']);
  const site = positional[0];
  if (site !== 'staging' && site !== 'live') {
    throw new Error('Say which site: staging or live.');
  }
  const file = path.resolve(`.env.render-${site}`);
  const exists = await access(file).then(
    () => true,
    () => false,
  );
  if (exists && !flags.has('replace')) {
    throw new Error(
      `${file} already exists. Making it again gives new secrets, and everyone signed in to the ` +
        `${site} site is signed out once it's pasted into Render. Delete the file first if that ` +
        'is what you want.',
    );
  }

  const { text, stagingPassword, sendsEmail } = hostingSettings(site, loadEnv());
  await writeFile(file, text, { flag: 'w' });

  console.log(
    [
      `Settings for the ${site} site written to:`,
      `  ${file}`,
      '',
      'To use them: open the file in Notepad, select all (Ctrl+A), copy (Ctrl+C). In Hostinger,',
      'open the web app and paste them into its Environment variables. It rebuilds by itself so',
      'the new values take effect.',
      'Keep the file private; delete it once Hostinger has the settings.',
      ...(stagingPassword
        ? [
            '',
            'The staging site will ask everyone for this user name and password (write them down):',
            '  user name: preview',
            `  password:  ${stagingPassword}`,
          ]
        : []),
      ...(sendsEmail
        ? []
        : [
            '',
            'Email is NOT included: real sending is not set up on this computer yet. Double-click',
            '"Set up email.cmd" first, then make this file again, if the site should send email.',
          ]),
    ].join('\n'),
  );
}

// Only when run as a script, not when a test imports the functions above.
if (process.argv[1] && /hosting-settings\.ts$/.test(process.argv[1])) {
  main().catch((error: unknown) => {
    console.error(
      `\n${error instanceof ConfigError || error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  });
}
