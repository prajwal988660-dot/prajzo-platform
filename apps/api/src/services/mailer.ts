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

/**
 * Development mailer: prints emails to the API log instead of sending them. Real sending
 * (SMTP through your email provider) is added when email is set up (docs/ENVIRONMENT.md).
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
