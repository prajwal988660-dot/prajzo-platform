import { parseEnv as parseEnvText } from 'node:util';
import { describe, expect, it } from 'vitest';
import { parseEnv } from '../config/env';
import { hostingSettings, readablePassword } from './hosting-settings';

const dev = {
  MONGODB_URI: 'mongodb://someone:secret@h1.example.net:27017,h2.example.net:27017/prajzo?ssl=true',
  MAIL_TRANSPORT: 'console',
  SMTP_PORT: 465,
};

describe('hosting settings (D-061)', () => {
  it('gives staging its own database, address, secret and site password, and they pass the checks', () => {
    const { text, stagingPassword } = hostingSettings('staging', dev);
    const values = parseEnvText(text);

    expect(values).toMatchObject({
      NODE_ENV: 'production',
      APP_ORIGIN: 'https://staging.prajzo.com',
      MONGODB_URI:
        'mongodb://someone:secret@h1.example.net:27017,h2.example.net:27017/prajzo-staging?ssl=true',
      TRUST_PROXY: 'true',
      STAGING_USER: 'preview',
      STAGING_PASSWORD: stagingPassword,
    });
    expect(values.SESSION_SECRET?.length).toBeGreaterThanOrEqual(64);
    // The real settings check accepts it as production settings.
    expect(() => parseEnv(values)).not.toThrow();
  });

  it('gives the live site a different database, no site password, and a different secret', () => {
    const staging = parseEnvText(hostingSettings('staging', dev).text);
    const live = parseEnvText(hostingSettings('live', dev).text);
    expect(live.APP_ORIGIN).toBe('https://prajzo.com');
    expect(live.MONGODB_URI).toContain('/prajzo-live?');
    expect(live.STAGING_PASSWORD).toBeUndefined();
    expect(live.SESSION_SECRET).not.toBe(staging.SESSION_SECRET);
    expect(() => parseEnv(live)).not.toThrow();
  });

  it('copies email settings only when real sending is set up, keeping awkward passwords intact', () => {
    expect(hostingSettings('live', dev).sendsEmail).toBe(false);
    expect(parseEnvText(hostingSettings('live', dev).text).MAIL_TRANSPORT).toBeUndefined();

    const withMail = hostingSettings('live', {
      ...dev,
      MAIL_TRANSPORT: 'smtp',
      SMTP_HOST: 'smtp.hostinger.com',
      SMTP_USER: 'contact@prajzo.com',
      SMTP_PASSWORD: 'p#ss word"1',
    });
    expect(withMail.sendsEmail).toBe(true);
    expect(parseEnvText(withMail.text)).toMatchObject({
      MAIL_TRANSPORT: 'smtp',
      SMTP_HOST: 'smtp.hostinger.com',
      SMTP_PORT: '465',
      SMTP_USER: 'contact@prajzo.com',
      SMTP_PASSWORD: 'p#ss word"1',
    });
  });

  it('makes site passwords that are long, readable and different each time', () => {
    const first = readablePassword();
    expect(first).toMatch(/^[a-z2-9]{5}(-[a-z2-9]{5}){3}$/);
    expect(first).not.toMatch(/[01lio]/);
    expect(readablePassword()).not.toBe(first);
  });
});
