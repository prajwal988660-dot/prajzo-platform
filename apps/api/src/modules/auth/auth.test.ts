import { apiErrorBodySchema, okResponseSchema, sessionResponseSchema } from '@prajzo/shared';
import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCaptureMailer } from '../../services/mailer';
import {
  browser,
  customerInput,
  sessionCookieOf,
  sessionsCollection,
  setCookieHeader,
  signUp,
} from '../../test/auth-helpers';
import { startTestDatabase, testApp, testEnv } from '../../test/helpers';
import { ContactMessageModel } from '../contact/contact-message.model';
import { createAdminUser } from './auth.service';
import { hashResetToken } from './password';
import { PasswordResetTokenModel } from './password-reset-token.model';
import { UserModel } from './user.model';

const strongPassword = 'a-long-passphrase-9';
const newPassword = 'another-long-passphrase-4';

let database: { stop: () => Promise<void> };

beforeAll(async () => {
  database = await startTestDatabase();
});

afterAll(async () => {
  await database.stop();
});

beforeEach(async () => {
  await Promise.all([
    UserModel.deleteMany({}),
    PasswordResetTokenModel.deleteMany({}),
    ContactMessageModel.deleteMany({}),
    sessionsCollection().deleteMany({}),
  ]);
});

/** A fresh app, so limits and sessions from other tests can't interfere. */
function newApp(overrides: Record<string, string> = {}) {
  const mailer = createCaptureMailer();
  return {
    app: testApp({ env: testEnv({ AUTH_RATE_LIMIT_MAX: '100', ...overrides }), mailer }),
    mailer,
  };
}

describe('creating an account', () => {
  it('creates a customer, signs them in and never returns the password', async () => {
    const { app } = newApp();
    const agent = browser(app);

    const response = await signUp(agent);

    const { user } = sessionResponseSchema.parse(response.body);
    expect(user).toMatchObject({ email: 'asha@example.com', name: 'Asha Rao', role: 'customer' });
    expect(JSON.stringify(response.body)).not.toMatch(/password|hash/i);

    const me = await agent.get('/api/v1/auth/me');
    expect(sessionResponseSchema.parse(me.body).user?.email).toBe('asha@example.com');
  });

  it('stores only a strong hash of the password and records the consent', async () => {
    const { app } = newApp();
    await signUp(browser(app));

    const stored = await UserModel.findOne({ email: 'asha@example.com' }).select('+passwordHash');
    expect(stored?.passwordHash).toMatch(/^\$argon2id\$/);
    expect(stored?.passwordHash).not.toContain(strongPassword);
    expect(stored?.termsAcceptedAt).toBeInstanceOf(Date);
  });

  it('keeps the email in lower case and refuses a second account for it, whatever the case', async () => {
    const { app } = newApp();
    await signUp(browser(app), { email: 'Asha@Example.COM' });

    const again = await browser(app)
      .post('/api/v1/auth/register')
      .send({ ...customerInput, email: 'asha@EXAMPLE.com', name: 'Someone Else' });

    expect(again.status).toBe(409);
    expect(apiErrorBodySchema.parse(again.body).error.fields?.email).toMatch(/already exists/);
    expect(await UserModel.countDocuments()).toBe(1);
  });

  it('explains every invalid detail and creates nothing', async () => {
    const { app } = newApp();
    const response = await browser(app)
      .post('/api/v1/auth/register')
      .send({ name: 'A', email: 'nope', password: 'short', acceptTerms: false });

    expect(response.status).toBe(400);
    expect(Object.keys(apiErrorBodySchema.parse(response.body).error.fields ?? {}).sort()).toEqual([
      'acceptTerms',
      'email',
      'name',
      'password',
    ]);
    expect(await UserModel.countDocuments()).toBe(0);
  });

  it('cannot be used to create an administrator', async () => {
    const { app } = newApp();
    const response = await signUp(browser(app), { role: 'admin', status: 'active' });

    expect(sessionResponseSchema.parse(response.body).user?.role).toBe('customer');
    expect((await UserModel.findOne())?.role).toBe('customer');
  });
});

describe('signing in', () => {
  it('signs in with the right password, whatever the case or spacing of the email', async () => {
    const { app } = newApp();
    await signUp(browser(app));

    const agent = browser(app);
    const response = await agent
      .post('/api/v1/auth/login')
      .send({ email: '  ASHA@example.com ', password: strongPassword });

    expect(response.status).toBe(200);
    expect(sessionResponseSchema.parse(response.body).user?.name).toBe('Asha Rao');
    expect(sessionCookieOf(response)).toBeTruthy();
    expect((await UserModel.findOne())?.lastLoginAt).toBeInstanceOf(Date);
  });

  it('gives the same answer for a wrong password and an unknown email, and no session', async () => {
    const { app } = newApp();
    await signUp(browser(app));

    const wrongPassword = await browser(app)
      .post('/api/v1/auth/login')
      .send({ email: 'asha@example.com', password: 'not-the-password' });
    const unknownEmail = await browser(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: 'not-the-password' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
    expect(apiErrorBodySchema.parse(wrongPassword.body).error.code).toBe('UNAUTHENTICATED');
    expect(sessionCookieOf(wrongPassword)).toBeNull();
    expect(sessionCookieOf(unknownEmail)).toBeNull();
  });

  it('issues a new session ID at every sign-in, and the old one stops working', async () => {
    const { app } = newApp();
    const agent = browser(app);
    const first = await signUp(agent);
    const firstId = sessionCookieOf(first);

    const second = await agent
      .post('/api/v1/auth/login')
      .send({ email: 'asha@example.com', password: strongPassword });
    const secondId = sessionCookieOf(second);

    expect(firstId).toBeTruthy();
    expect(secondId).toBeTruthy();
    expect(secondId).not.toBe(firstId);

    const oldSession = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', `prajzo.sid=${firstId}`);
    expect(sessionResponseSchema.parse(oldSession.body).user).toBeNull();
  });

  it('sets a cookie that scripts cannot read and other websites cannot ride on', async () => {
    const { app } = newApp();
    const cookie = setCookieHeader(await signUp(browser(app)));

    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Path=\//);
    expect(cookie).toMatch(/Expires=/i); // lasts for a set time, not just until the browser closes
  });

  it('uses the __Host- cookie in production: Secure, whole site, no Domain (behind a proxy that speaks https)', async () => {
    const { app } = newApp({
      NODE_ENV: 'production',
      APP_ORIGIN: 'https://prajzo.example',
      TRUST_PROXY: 'true',
    });
    const response = await browser(app)
      .post('/api/v1/auth/register')
      .set('X-Forwarded-Proto', 'https')
      .send(customerInput);

    expect(response.status).toBe(201);
    const cookie = setCookieHeader(response);
    // Browsers accept a cookie with this name only if it has exactly these attributes.
    expect(cookie).toMatch(/^__Host-prajzo\.sid=/);
    expect(cookie).toMatch(/; Secure/i);
    expect(cookie).toMatch(/; Path=\/(;|$)/);
    expect(cookie).not.toMatch(/Domain=/i);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  it('keeps the plain cookie name while developing and testing', async () => {
    const { app } = newApp();
    expect(setCookieHeader(await signUp(browser(app)))).toMatch(/^prajzo\.sid=/);
  });

  it('refuses a disabled account with a clear message, but only after the right password', async () => {
    const { app } = newApp();
    await signUp(browser(app));
    await UserModel.updateOne({ email: 'asha@example.com' }, { status: 'disabled' });

    const right = await browser(app)
      .post('/api/v1/auth/login')
      .send({ email: 'asha@example.com', password: strongPassword });
    const wrong = await browser(app)
      .post('/api/v1/auth/login')
      .send({ email: 'asha@example.com', password: 'not-the-password' });

    expect(right.status).toBe(403);
    expect(apiErrorBodySchema.parse(right.body).error.message).toMatch(/disabled/);
    expect(wrong.status).toBe(401); // does not reveal that the account exists or is disabled
  });

  it('asks for both fields', async () => {
    const { app } = newApp();
    const response = await browser(app)
      .post('/api/v1/auth/login')
      .send({ email: '', password: '' });

    expect(response.status).toBe(400);
    expect(Object.keys(apiErrorBodySchema.parse(response.body).error.fields ?? {}).sort()).toEqual([
      'email',
      'password',
    ]);
  });
});

describe('sessions', () => {
  it('reports nobody signed in for a visitor without a session', async () => {
    const { app } = newApp();
    const response = await request(app).get('/api/v1/auth/me');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ user: null });
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('signs out: the cookie is cleared and the stored session is deleted', async () => {
    const { app } = newApp();
    const agent = browser(app);
    const signedUp = await signUp(agent);
    const sid = sessionCookieOf(signedUp);
    expect(await sessionsCollection().countDocuments()).toBe(1);

    const out = await agent.post('/api/v1/auth/logout');

    expect(out.status).toBe(204);
    expect(setCookieHeader(out)).toMatch(/prajzo\.sid=;/);
    expect(await sessionsCollection().countDocuments()).toBe(0);
    const reused = await request(app).get('/api/v1/auth/me').set('Cookie', `prajzo.sid=${sid}`);
    expect(sessionResponseSchema.parse(reused.body).user).toBeNull();
  });

  it('signing out twice, or while signed out, is harmless', async () => {
    const { app } = newApp();
    expect((await request(app).post('/api/v1/auth/logout')).status).toBe(204);
    const agent = browser(app);
    await signUp(agent);
    expect((await agent.post('/api/v1/auth/logout')).status).toBe(204);
    expect((await agent.post('/api/v1/auth/logout')).status).toBe(204);
  });

  it('ends an expired session', async () => {
    const { app } = newApp();
    const agent = browser(app);
    await signUp(agent);
    await sessionsCollection().updateMany({}, { $set: { expires: new Date(Date.now() - 1000) } });

    const me = await agent.get('/api/v1/auth/me');
    expect(sessionResponseSchema.parse(me.body).user).toBeNull();
    expect((await agent.patch('/api/v1/me').send({ name: 'Asha R' })).status).toBe(401);
  });

  it('stops working at once when the account is disabled or deleted', async () => {
    const { app } = newApp();
    const agent = browser(app);
    await signUp(agent);

    await UserModel.updateOne({ email: 'asha@example.com' }, { status: 'disabled' });
    expect((await agent.patch('/api/v1/me').send({ name: 'Asha R' })).status).toBe(401);
    expect(sessionResponseSchema.parse((await agent.get('/api/v1/auth/me')).body).user).toBeNull();
  });

  it('lasts 14 days for customers by default', async () => {
    const { app } = newApp();
    const cookie = setCookieHeader(await signUp(browser(app)));
    const expires = new Date(/Expires=([^;]+)/i.exec(cookie)?.[1] ?? '').getTime();
    const days = (expires - Date.now()) / (24 * 60 * 60 * 1000);

    expect(days).toBeGreaterThan(13.9);
    expect(days).toBeLessThan(14.1);
  });
});

describe('your profile', () => {
  it('can be updated, and needs a signed-in person', async () => {
    const { app } = newApp();
    expect((await request(app).patch('/api/v1/me').send({ name: 'X Y' })).status).toBe(401);

    const agent = browser(app);
    await signUp(agent);
    const response = await agent
      .patch('/api/v1/me')
      .send({ name: ' Asha R. Rao ', phone: '+91 98866 07720' });

    expect(response.status).toBe(200);
    expect(sessionResponseSchema.parse(response.body).user).toMatchObject({
      name: 'Asha R. Rao',
      phone: '+91 98866 07720',
    });
    const stored = await UserModel.findOne();
    expect(stored?.name).toBe('Asha R. Rao');
  });

  it('removes the phone number when an update does not include one', async () => {
    const { app } = newApp();
    const agent = browser(app);
    await signUp(agent, { phone: '+91 98866 07720' });
    expect((await UserModel.findOne())?.phone).toBe('+91 98866 07720');

    const response = await agent.patch('/api/v1/me').send({ name: 'Asha Rao' });

    expect(response.status).toBe(200);
    expect(sessionResponseSchema.parse(response.body).user?.phone).toBeNull();
    expect((await UserModel.findOne())?.phone).toBeUndefined();
  });

  it('cannot be used to change the email, role or status', async () => {
    const { app } = newApp();
    const agent = browser(app);
    await signUp(agent);
    await agent
      .patch('/api/v1/me')
      .send({ name: 'Asha Rao', email: 'other@example.com', role: 'admin', status: 'disabled' });

    const stored = await UserModel.findOne();
    expect(stored).toMatchObject({ email: 'asha@example.com', role: 'customer', status: 'active' });
  });

  it('rejects an empty name', async () => {
    const { app } = newApp();
    const agent = browser(app);
    await signUp(agent);
    const response = await agent.patch('/api/v1/me').send({ name: '' });

    expect(response.status).toBe(400);
    expect(apiErrorBodySchema.parse(response.body).error.fields).toHaveProperty('name');
  });
});

describe('changing your password', () => {
  it('needs the current password, and signs other devices out', async () => {
    const { app } = newApp();
    const phone = browser(app);
    await signUp(phone);
    const laptop = browser(app);
    await laptop
      .post('/api/v1/auth/login')
      .send({ email: 'asha@example.com', password: strongPassword });
    expect(await sessionsCollection().countDocuments()).toBe(2);

    const wrongCurrent = await laptop
      .post('/api/v1/me/password')
      .send({ currentPassword: 'not-my-password', newPassword });
    expect(wrongCurrent.status).toBe(400);
    expect(apiErrorBodySchema.parse(wrongCurrent.body).error.fields).toHaveProperty(
      'currentPassword',
    );

    const changed = await laptop
      .post('/api/v1/me/password')
      .send({ currentPassword: strongPassword, newPassword });
    expect(changed.status).toBe(200);
    expect(okResponseSchema.parse(changed.body).ok).toBe(true);

    // This device stays signed in; the other one is signed out.
    expect(
      sessionResponseSchema.parse((await laptop.get('/api/v1/auth/me')).body).user,
    ).not.toBeNull();
    expect(sessionResponseSchema.parse((await phone.get('/api/v1/auth/me')).body).user).toBeNull();

    // The old password no longer works; the new one does.
    const oldLogin = await browser(app)
      .post('/api/v1/auth/login')
      .send({ email: 'asha@example.com', password: strongPassword });
    const newLogin = await browser(app)
      .post('/api/v1/auth/login')
      .send({ email: 'asha@example.com', password: newPassword });
    expect(oldLogin.status).toBe(401);
    expect(newLogin.status).toBe(200);
  });

  it('applies the same rules as sign-up to the new password', async () => {
    const { app } = newApp();
    const agent = browser(app);
    await signUp(agent);

    const tooShort = await agent
      .post('/api/v1/me/password')
      .send({ currentPassword: strongPassword, newPassword: 'short' });
    const same = await agent
      .post('/api/v1/me/password')
      .send({ currentPassword: strongPassword, newPassword: strongPassword });

    expect(tooShort.status).toBe(400);
    expect(same.status).toBe(400);
    expect(apiErrorBodySchema.parse(same.body).error.fields?.newPassword).toMatch(/different/);
  });

  it('needs a signed-in person', async () => {
    const { app } = newApp();
    const response = await request(app)
      .post('/api/v1/me/password')
      .send({ currentPassword: strongPassword, newPassword });
    expect(response.status).toBe(401);
  });
});

describe('resetting a forgotten password', () => {
  async function requestReset(app: ReturnType<typeof newApp>['app'], email: string) {
    return request(app).post('/api/v1/auth/password/forgot').send({ email });
  }

  function tokenFrom(mail: { text: string } | undefined): string {
    const match = /reset-password\?token=([\w-]+)/.exec(mail?.text ?? '');
    if (!match?.[1]) throw new Error('No reset link in the email');
    return match[1];
  }

  it('answers identically for known and unknown emails, and only emails real customers', async () => {
    const { app, mailer } = newApp();
    await signUp(browser(app));

    const known = await requestReset(app, 'asha@example.com');
    const unknown = await requestReset(app, 'nobody@example.com');

    expect(known.status).toBe(202);
    expect(unknown.status).toBe(202);
    expect(known.body).toEqual(unknown.body);
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]).toMatchObject({
      to: 'asha@example.com',
      subject: 'Reset your Prajzo password',
    });
  });

  it('stores only a hash of the token, never the token', async () => {
    const { app, mailer } = newApp();
    await signUp(browser(app));
    await requestReset(app, 'asha@example.com');
    const token = tokenFrom(mailer.sent[0]);

    const stored = await PasswordResetTokenModel.find().lean();
    expect(stored).toHaveLength(1);
    expect(stored[0]?.tokenHash).toBe(hashResetToken(token));
    expect(JSON.stringify(stored)).not.toContain(token);
  });

  it('lets the link choose a new password once, and signs out every device', async () => {
    const { app, mailer } = newApp();
    const agent = browser(app);
    await signUp(agent);
    await requestReset(app, 'asha@example.com');
    const token = tokenFrom(mailer.sent[0]);

    const reset = await request(app)
      .post('/api/v1/auth/password/reset')
      .send({ token, password: newPassword });
    expect(reset.status).toBe(200);

    expect(sessionResponseSchema.parse((await agent.get('/api/v1/auth/me')).body).user).toBeNull();
    const login = await browser(app)
      .post('/api/v1/auth/login')
      .send({ email: 'asha@example.com', password: newPassword });
    expect(login.status).toBe(200);

    const reused = await request(app)
      .post('/api/v1/auth/password/reset')
      .send({ token, password: 'yet-another-passphrase-7' });
    expect(reused.status).toBe(400);
    expect(apiErrorBodySchema.parse(reused.body).error.message).toMatch(/invalid or has expired/);
  });

  it('rejects a made-up link and an expired link', async () => {
    const { app, mailer } = newApp();
    await signUp(browser(app));
    await requestReset(app, 'asha@example.com');
    const token = tokenFrom(mailer.sent[0]);

    const madeUp = await request(app)
      .post('/api/v1/auth/password/reset')
      .send({ token: 'x'.repeat(43), password: newPassword });
    expect(madeUp.status).toBe(400);

    await PasswordResetTokenModel.updateMany({}, { expiresAt: new Date(Date.now() - 1000) });
    const expired = await request(app)
      .post('/api/v1/auth/password/reset')
      .send({ token, password: newPassword });
    expect(expired.status).toBe(400);
  });

  it('keeps the link valid when the chosen password is rejected', async () => {
    const { app, mailer } = newApp();
    await signUp(browser(app));
    await requestReset(app, 'asha@example.com');
    const token = tokenFrom(mailer.sent[0]);

    const weak = await request(app)
      .post('/api/v1/auth/password/reset')
      .send({ token, password: 'short' });
    expect(weak.status).toBe(400);
    expect(apiErrorBodySchema.parse(weak.body).error.fields).toHaveProperty('password');

    const good = await request(app)
      .post('/api/v1/auth/password/reset')
      .send({ token, password: newPassword });
    expect(good.status).toBe(200);
  });

  it('makes an older link stop working when a new one is requested', async () => {
    const { app, mailer } = newApp();
    await signUp(browser(app));
    await requestReset(app, 'asha@example.com');
    await requestReset(app, 'asha@example.com');
    const [older, newer] = [tokenFrom(mailer.sent[0]), tokenFrom(mailer.sent[1])];

    expect(
      (
        await request(app)
          .post('/api/v1/auth/password/reset')
          .send({ token: older, password: newPassword })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post('/api/v1/auth/password/reset')
          .send({ token: newer, password: newPassword })
      ).status,
    ).toBe(200);
  });

  it('is not offered to administrators', async () => {
    const { app, mailer } = newApp();
    await createAdminUser({
      name: 'Boss',
      email: 'boss@example.com',
      password: 'a-very-long-admin-pass-1',
    });

    const response = await requestReset(app, 'boss@example.com');
    expect(response.status).toBe(202);
    expect(mailer.sent).toHaveLength(0);
  });

  it('still answers when the email cannot be sent', async () => {
    const failingMailer = { send: () => Promise.reject(new Error('SMTP down')) };
    const app = testApp({ env: testEnv({ AUTH_RATE_LIMIT_MAX: '100' }), mailer: failingMailer });
    await signUp(browser(app));

    expect((await requestReset(app, 'asha@example.com')).status).toBe(202);
  });
});

describe('limits on guessing', () => {
  it('blocks a connection after too many failed sign-ins, even with the right password', async () => {
    const { app } = newApp({ AUTH_RATE_LIMIT_MAX: '3' });
    await signUp(browser(app));

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const wrong = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'asha@example.com', password: `wrong-${attempt}` });
      expect(wrong.status).toBe(401);
    }
    const blocked = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'asha@example.com', password: strongPassword });
    expect(blocked.status).toBe(429);
    expect(apiErrorBodySchema.parse(blocked.body).error.code).toBe('RATE_LIMITED');
  });

  it('blocks guesses at one email even when they come from different connections', async () => {
    const { app } = newApp({ AUTH_RATE_LIMIT_MAX: '3', TRUST_PROXY: 'true' });
    await signUp(browser(app));

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const wrong = await request(app)
        .post('/api/v1/auth/login')
        .set('X-Forwarded-For', `203.0.113.${attempt}`)
        .send({ email: 'asha@example.com', password: `wrong-${attempt}` });
      expect(wrong.status).toBe(401);
    }
    const fromYetAnotherConnection = await request(app)
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', '203.0.113.99')
      .send({ email: 'Asha@Example.com', password: strongPassword });
    expect(fromYetAnotherConnection.status).toBe(429);
  });

  it('does not count successful sign-ins', async () => {
    const { app } = newApp({ AUTH_RATE_LIMIT_MAX: '3' });
    await signUp(browser(app));

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const ok = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'asha@example.com', password: strongPassword });
      expect(ok.status).toBe(200);
    }
  });

  it('limits account creation and password-reset requests', async () => {
    const { app } = newApp({ AUTH_RATE_LIMIT_MAX: '2' });
    const attempt = (n: number) =>
      request(app)
        .post('/api/v1/auth/register')
        .send({ ...customerInput, email: `person${n}@example.com` });
    expect((await attempt(1)).status).toBe(201);
    expect((await attempt(2)).status).toBe(201);
    expect((await attempt(3)).status).toBe(429);

    const forgot = () =>
      request(app).post('/api/v1/auth/password/forgot').send({ email: 'x@example.com' });
    expect((await forgot()).status).toBe(202);
    expect((await forgot()).status).toBe(202);
    expect((await forgot()).status).toBe(429);
  });
});

describe('requests from other websites', () => {
  it('blocks a request that another website started', async () => {
    const { app } = newApp();
    const response = await request(app)
      .post('/api/v1/auth/register')
      .set('Origin', 'https://evil.example')
      .send(customerInput);

    expect(response.status).toBe(403);
    expect(apiErrorBodySchema.parse(response.body).error.code).toBe('FORBIDDEN');
    expect(await UserModel.countDocuments()).toBe(0);
  });

  it('allows this website, by its public address or by the address it was reached on', async () => {
    const { app } = newApp();
    const byPublicAddress = await request(app)
      .post('/api/v1/auth/register')
      .set('Origin', 'http://localhost:5173') // APP_ORIGIN in the test settings
      .send(customerInput);
    expect(byPublicAddress.status).toBe(201);

    const host = 'phone-test.local:8080';
    const byHost = await request(app)
      .post('/api/v1/auth/register')
      .set('Host', host)
      .set('Origin', `http://${host}`)
      .send({ ...customerInput, email: 'second@example.com' });
    expect(byHost.status).toBe(201);
  });

  it('never blocks plain reads, and treats tools without an Origin (like curl) normally', async () => {
    const { app } = newApp();
    expect(
      (await request(app).get('/api/v1/auth/me').set('Origin', 'https://evil.example')).status,
    ).toBe(200);
    expect((await request(app).post('/api/v1/auth/register').send(customerInput)).status).toBe(201);
  });
});

describe('while the database is connected, unknown account routes stay unknown', () => {
  it('answers 404 for routes that do not exist under /auth and /me', async () => {
    const { app } = newApp();
    expect((await request(app).get('/api/v1/auth/nothing')).status).toBe(404);
    expect((await request(app).get('/api/v1/me/nothing')).status).toBe(404);
  });

  it('asks anyone who is not an administrator to sign in before saying anything about /admin', async () => {
    // So nobody can find out which admin addresses exist. An administrator gets the plain 404.
    const { app } = newApp();
    expect((await request(app).get('/api/v1/admin/nothing')).status).toBe(401);
  });
});

describe('the database connection itself', () => {
  it('is the in-memory test database, not a real one', () => {
    expect(mongoose.connection.host).toBeTruthy();
    expect(mongoose.connection.name).toBe('prajzo-test');
  });
});

describe('how long a sign-in can last in total', () => {
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Visits at each of the given moments (milliseconds after `start`), as someone who keeps using
   * the site would, and says whether they were still signed in at the last one. A visit that finds
   * them signed out stops the walk.
   */
  async function stillSignedInAfter(
    agent: ReturnType<typeof browser>,
    start: number,
    visits: number[],
  ) {
    let signedIn = true;
    for (const moment of visits) {
      vi.setSystemTime(start + moment);
      const answer = sessionResponseSchema.parse((await agent.get('/api/v1/auth/me')).body);
      signedIn = answer.user !== null;
      if (!signedIn) break;
    }
    return signedIn;
  }

  const every = (step: number, until: number) =>
    Array.from({ length: Math.floor(until / step) }, (_, index) => (index + 1) * step);

  it('ends a customer sign-in after 60 days, even one used every ten days', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const { app } = newApp();
    const agent = browser(app);
    await signUp(agent);
    const start = Date.now();

    expect(await stillSignedInAfter(agent, start, every(10 * DAY, 60 * DAY))).toBe(true);
    expect(await stillSignedInAfter(agent, start, [60 * DAY + HOUR])).toBe(false);
    // It is really over: the guarded routes refuse too, and the stored session is gone.
    expect((await agent.get('/api/v1/project-requests')).status).toBe(401);
    expect(await sessionsCollection().countDocuments()).toBe(0);
  });

  it('ends an administrator sign-in after 24 hours, even one used every six hours', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const { app } = newApp();
    await createAdminUser({ name: 'Boss', email: 'boss@example.com', password: strongPassword });
    const agent = browser(app);
    const login = await agent
      .post('/api/v1/auth/admin/login')
      .send({ email: 'boss@example.com', password: strongPassword });
    expect(login.status).toBe(200);
    const start = Date.now();

    expect(await stillSignedInAfter(agent, start, every(6 * HOUR, 24 * HOUR))).toBe(true);
    expect((await agent.get('/api/v1/admin/overview')).status).toBe(200);
    expect(await stillSignedInAfter(agent, start, [24 * HOUR + 60_000])).toBe(false);
    expect((await agent.get('/api/v1/admin/overview')).status).toBe(401);
  });

  it('can be set shorter, and tells the browser to forget the cookie when it ends', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const { app } = newApp({ SESSION_TTL_DAYS: '2', SESSION_MAX_DAYS: '3' });
    const agent = browser(app);
    await signUp(agent);
    const start = Date.now();

    expect(await stillSignedInAfter(agent, start, every(DAY, 3 * DAY))).toBe(true);
    vi.setSystemTime(start + 3 * DAY + HOUR);
    const over = await agent.get('/api/v1/auth/me');
    expect(sessionResponseSchema.parse(over.body).user).toBeNull();
    expect(setCookieHeader(over)).toMatch(/^prajzo\.sid=;/);
  });

  it('signs out a session that was made before this limit existed', async () => {
    const { app } = newApp();
    const agent = browser(app);
    await signUp(agent);
    await sessionsCollection().updateMany({}, { $unset: { 'session.startedAt': '' } });

    const answer = await agent.get('/api/v1/auth/me');

    expect(sessionResponseSchema.parse(answer.body).user).toBeNull();
    expect((await agent.get('/api/v1/project-requests')).status).toBe(401);
  });

  it('starts the clock again from a new sign-in', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const { app } = newApp({ SESSION_TTL_DAYS: '2', SESSION_MAX_DAYS: '3' });
    const agent = browser(app);
    await signUp(agent);
    vi.setSystemTime(Date.now() + 3 * DAY + HOUR);
    expect(sessionResponseSchema.parse((await agent.get('/api/v1/auth/me')).body).user).toBeNull();

    const again = await agent
      .post('/api/v1/auth/login')
      .send({ email: 'asha@example.com', password: strongPassword });
    expect(again.status).toBe(200);
    vi.setSystemTime(Date.now() + DAY);
    expect(
      sessionResponseSchema.parse((await agent.get('/api/v1/auth/me')).body).user,
    ).not.toBeNull();
  });
});
