/**
 * Turns on real email sending through your mailbox (D-060). Run it yourself, in a terminal
 * window, or double-click "Set up email.cmd":
 *
 *   npm run mail:setup -w @prajzo/api
 *
 * It asks for the mailbox and its password (hidden as you type), signs in to the mail server to
 * check them, and only then saves them in apps/api/.env. The password never appears on screen,
 * in a log, or anywhere but that file, which git ignores. It can then send you a test email.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { siteContact } from '@prajzo/shared';
import { setEnvValues } from '../config/env-file';
import { createSmtpMailer } from '../services/mailer';
import { ask, askHidden } from './terminal-prompts';

const HOSTINGER_SMTP = { host: 'smtp.hostinger.com', port: 465 as const };

async function main(): Promise<void> {
  if (!process.stdin.isTTY) {
    throw new Error(
      'This asks for a password and hides it as you type, so run it in a terminal window ' +
        '(or double-click "Set up email.cmd").',
    );
  }
  const envFile = path.resolve('.env');
  const current = await readFile(envFile, 'utf8').catch(() => {
    throw new Error(`${envFile} was not found. Set up the project first (docs/SETUP.md).`);
  });

  console.log('Turn on real email sending for the Prajzo website.\n');
  const mailbox =
    (await ask(`Mailbox address [${siteContact.email}]: `)).trim().toLowerCase() ||
    siteContact.email;
  const host = (await ask(`Mail server [${HOSTINGER_SMTP.host}]: `)).trim() || HOSTINGER_SMTP.host;
  const password = await askHidden(`Password for ${mailbox} (hidden while you type): `);
  if (!password) throw new Error('No password was typed. Nothing was changed.');

  console.log(`\nSigning in to ${host} as ${mailbox}...`);
  const mailer = createSmtpMailer({
    SMTP_HOST: host,
    SMTP_PORT: HOSTINGER_SMTP.port,
    SMTP_USER: mailbox,
    SMTP_PASSWORD: password,
    MAIL_FROM: undefined,
    MAIL_FROM_NAME: 'Prajzo',
  });
  try {
    await mailer.verify();
  } catch (error) {
    mailer.close();
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      `The mail server did not accept this (${reason}). Nothing was saved. Check the password ` +
        'in Hostinger (Emails, then your mailbox) and try again.',
      { cause: error },
    );
  }
  console.log('Signed in.');

  await writeFile(
    envFile,
    setEnvValues(current, {
      MAIL_TRANSPORT: 'smtp',
      SMTP_HOST: host,
      SMTP_PORT: String(HOSTINGER_SMTP.port),
      SMTP_USER: mailbox,
      SMTP_PASSWORD: password,
    }),
  );
  console.log(`Saved in ${envFile}. Restart the website (npm run host:local) to use it.`);

  const test = (await ask(`\nSend a test email to ${mailbox} now? (y/N): `)).trim().toLowerCase();
  if (test === 'y' || test === 'yes') {
    await mailer.send({
      to: mailbox,
      subject: 'Prajzo website: email sending works',
      text: [
        'This is a test from the Prajzo website.',
        '',
        'If you are reading it, the website can send emails: project updates to customers, and',
        'new enquiries and requests to you.',
      ].join('\n'),
    });
    console.log('Sent. Check the inbox (and the spam folder) of that mailbox.');
  }
  mailer.close();
}

main().catch((error: unknown) => {
  console.error(`\n${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
