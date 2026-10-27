import type { AddressInfo } from 'node:net';
import { SMTPServer, type SMTPServerOptions } from 'smtp-server';
import { afterEach, describe, expect, it } from 'vitest';
import { parseEnv } from '../config/env';
import { createSmtpMailer } from './mailer';

type Received = { from: string; to: string[]; data: string; secure: boolean; user: string };

const servers: SMTPServer[] = [];

/** A real SMTP server on this computer, with STARTTLS and a sign-in, that keeps what it gets. */
async function startServer(options: Partial<SMTPServerOptions> = {}) {
  const received: Received[] = [];
  const server = new SMTPServer({
    logger: false,
    authMethods: ['PLAIN', 'LOGIN'],
    onAuth(auth, _session, done) {
      if (auth.username === 'contact@prajzo.com' && auth.password === 'right-password') {
        done(null, { user: auth.username });
      } else {
        done(new Error('Invalid username or password'));
      }
    },
    onData(stream, session, done) {
      let data = '';
      stream.on('data', (chunk: Buffer) => (data += chunk.toString()));
      stream.on('end', () => {
        received.push({
          from: session.envelope.mailFrom ? session.envelope.mailFrom.address : '',
          to: session.envelope.rcptTo.map((rcpt) => rcpt.address),
          data,
          secure: session.secure,
          user: String(session.user),
        });
        done();
      });
    },
    ...options,
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { port: (server.server.address() as AddressInfo).port, received };
}

function mailerFor(port: number, password = 'right-password') {
  return createSmtpMailer(
    {
      SMTP_HOST: '127.0.0.1',
      // Any port but 465 means STARTTLS, which is what the test server offers.
      SMTP_PORT: port as 587,
      SMTP_USER: 'contact@prajzo.com',
      SMTP_PASSWORD: password,
      MAIL_FROM: undefined,
      MAIL_FROM_NAME: 'Prajzo',
    },
    // The test server's certificate is self-signed; real servers are always checked.
    { allowSelfSignedForTests: true },
  );
}

afterEach(async () => {
  await Promise.all(
    servers
      .splice(0)
      .map((server) => new Promise<void>((resolve) => server.close(() => resolve()))),
  );
});

describe('the SMTP mailer (D-060)', () => {
  it('signs in over an encrypted connection and sends the email', async () => {
    const { port, received } = await startServer();
    const mailer = mailerFor(port);
    await mailer.send({
      to: 'asha@example.com',
      replyTo: 'meera@example.com',
      subject: 'Your quote is ready',
      text: 'Hello Asha,\n\nYour quote for PRZ-2026-0001 is ready.',
    });
    mailer.close();

    expect(received).toHaveLength(1);
    const [mail] = received;
    expect(mail).toMatchObject({
      from: 'contact@prajzo.com',
      to: ['asha@example.com'],
      secure: true,
      user: 'contact@prajzo.com',
    });
    expect(mail?.data).toMatch(/^From: Prajzo <contact@prajzo\.com>$/m);
    expect(mail?.data).toMatch(/^Reply-To: meera@example\.com$/m);
    expect(mail?.data).toMatch(/^Subject: Your quote is ready$/m);
    expect(mail?.data).toContain('PRZ-2026-0001');
  });

  it('verify() signs in without sending anything', async () => {
    const { port, received } = await startServer();
    const mailer = mailerFor(port);
    await expect(mailer.verify()).resolves.toBeUndefined();
    mailer.close();
    expect(received).toHaveLength(0);
  });

  it('fails, without sending, when the password is wrong', async () => {
    const { port, received } = await startServer();
    const mailer = mailerFor(port, 'wrong-password');
    await expect(mailer.send({ to: 'asha@example.com', subject: 'x', text: 'x' })).rejects.toThrow(
      /Invalid/,
    );
    mailer.close();
    expect(received).toHaveLength(0);
  });

  it('refuses to send the password over a connection that cannot be encrypted', async () => {
    const { port, received } = await startServer({
      disabledCommands: ['STARTTLS'],
      allowInsecureAuth: true,
    });
    const mailer = mailerFor(port);
    await expect(
      mailer.send({ to: 'asha@example.com', subject: 'x', text: 'x' }),
    ).rejects.toThrow();
    mailer.close();
    expect(received).toHaveLength(0);
  });
});

describe('email settings', () => {
  const base = {
    NODE_ENV: 'test',
    APP_ORIGIN: 'http://localhost:5173',
    MONGODB_URI: 'mongodb://127.0.0.1:27017/prajzo-test',
    SESSION_SECRET: 'test-session-secret-that-is-long-enough-1234',
  };

  it('prints emails by default, so nothing is sent by accident', () => {
    expect(parseEnv(base).MAIL_TRANSPORT).toBe('console');
  });

  it('needs the server, mailbox and password to send for real', () => {
    expect(() => parseEnv({ ...base, MAIL_TRANSPORT: 'smtp' })).toThrow(
      /SMTP_HOST is required[\s\S]*SMTP_USER is required[\s\S]*SMTP_PASSWORD is required/,
    );
    const env = parseEnv({
      ...base,
      MAIL_TRANSPORT: 'smtp',
      SMTP_HOST: 'smtp.hostinger.com',
      SMTP_USER: 'contact@prajzo.com',
      SMTP_PASSWORD: 'x',
    });
    expect(env.SMTP_PORT).toBe(465);
    expect(env.MAIL_FROM_NAME).toBe('Prajzo');
  });

  it('only allows the two encrypted ports', () => {
    expect(() => parseEnv({ ...base, SMTP_PORT: '25' })).toThrow(/SMTP_PORT must be 465 or 587/);
    expect(parseEnv({ ...base, SMTP_PORT: '587' }).SMTP_PORT).toBe(587);
  });

  it('never prints the password when a setting is wrong', () => {
    let message = '';
    try {
      parseEnv({ ...base, MAIL_TRANSPORT: 'smtp', SMTP_PASSWORD: 'super-secret-value' });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain('SMTP_HOST');
    expect(message).not.toContain('super-secret-value');
  });
});
