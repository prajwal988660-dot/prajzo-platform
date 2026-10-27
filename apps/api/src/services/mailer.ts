import nodemailer from 'nodemailer';
import type { Env } from '../config/env';
import type { Logger } from '../lib/logger';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

type SmtpSettings = Pick<
  Env,
  'SMTP_HOST' | 'SMTP_PORT' | 'SMTP_USER' | 'SMTP_PASSWORD' | 'MAIL_FROM' | 'MAIL_FROM_NAME'
>;

/**
 * Sends email through your mailbox's SMTP server (D-060), such as contact@prajzo.com at
 * Hostinger. The connection is always encrypted: port 465 from the start, port 587 must upgrade
 * with STARTTLS or nothing is sent. The certificate is always checked. Short timeouts, so a slow
 * mail server can't hold up the person waiting for the page; a failed send rejects, and every
 * caller logs it without failing what the person did.
 */
export function createSmtpMailer(
  settings: SmtpSettings,
  { allowSelfSignedForTests = false }: { allowSelfSignedForTests?: boolean } = {},
): Mailer & { verify: () => Promise<void>; close: () => void } {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = settings;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
    throw new Error('SMTP_HOST, SMTP_USER and SMTP_PASSWORD are needed to send email');
  }
  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    requireTLS: true,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    tls: { rejectUnauthorized: !allowSelfSignedForTests, minVersion: 'TLSv1.2' },
  });
  const from = { name: settings.MAIL_FROM_NAME, address: settings.MAIL_FROM ?? SMTP_USER };

  return {
    async send(message) {
      await transport.sendMail({
        from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        ...(message.replyTo ? { replyTo: message.replyTo } : {}),
      });
    },
    /** Signs in to the mail server without sending anything. */
    async verify() {
      await transport.verify();
    },
    close() {
      transport.close();
    },
  };
}

/**
 * Development mailer: prints emails to the API log instead of sending them. Used whenever
 * MAIL_TRANSPORT is "console" (the default).
 */
export function createConsoleMailer(logger: Logger, { showBody }: { showBody: boolean }): Mailer {
  return {
    send(message) {
      logger.info(
        { to: message.to, subject: message.subject },
        showBody
          ? `Email (printed, not sent):\n${message.text}`
          : 'Email not sent: no email provider is set up yet',
      );
      return Promise.resolve();
    },
  };
}

/** Test mailer: keeps every message so tests can check what would have been sent. */
export function createCaptureMailer(): Mailer & { sent: MailMessage[] } {
  const sent: MailMessage[] = [];
  return {
    sent,
    send(message) {
      sent.push(message);
      return Promise.resolve();
    },
  };
}
