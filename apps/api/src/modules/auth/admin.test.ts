import { adminOverviewSchema, apiErrorBodySchema, sessionResponseSchema } from '@prajzo/shared';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { AppError } from '../../lib/errors';
import { browser, setCookieHeader, sessionsCollection, signUp } from '../../test/auth-helpers';
import { startTestDatabase, testApp, testEnv } from '../../test/helpers';
import { ContactMessageModel } from '../contact/contact-message.model';
import { createAdminUser, findAdminByEmail, setAdminPassword } from './auth.service';
import { PasswordResetTokenModel } from './password-reset-token.model';
import { UserModel } from './user.model';

const adminAccount = {
  name: 'Prajzo Admin',
  email: 'boss@example.com',
  password: 'a-very-long-admin-pass-1',
};

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

function newApp(overrides: Record<string, string> = {}) {
  return testApp({ env: testEnv({ AUTH_RATE_LIMIT_MAX: '100', ...overrides }) });
}

async function adminSignIn(agent: ReturnType<typeof browser>) {
  return agent
    .post('/api/v1/auth/admin/login')
    .send({ email: adminAccount.email, password: adminAccount.password });
}

describe('who can see the admin overview', () => {
  it('refuses a visitor who is not signed in', async () => {
    const response = await request(newApp()).get('/api/v1/admin/overview');

    expect(response.status).toBe(401);
    expect(apiErrorBodySchema.parse(response.body).error.code).toBe('UNAUTHENTICATED');
  });

  it('refuses a signed-in customer, with 403 rather than pretending the page is missing', async () => {
    const app = newApp();
    const customer = browser(app);
    await signUp(customer);

    const response = await customer.get('/api/v1/admin/overview');

    expect(response.status).toBe(403);
    expect(apiErrorBodySchema.parse(response.body).error.code).toBe('FORBIDDEN');
  });

  it('shows an administrator real counts from the database', async () => {
    const app = newApp();
    await createAdminUser(adminAccount);
    await signUp(browser(app), { email: 'one@example.com' });
    await signUp(browser(app), { email: 'two@example.com' });
    await ContactMessageModel.create([
      { name: 'A', email: 'a@example.com', message: 'x'.repeat(30), consentAt: new Date() },
      { name: 'B', email: 'b@example.com', message: 'y'.repeat(30), consentAt: new Date() },
      {
        name: 'C',
        email: 'c@example.com',
        message: 'z'.repeat(30),
        consentAt: new Date(),
        status: 'read',
      },
    ]);

    const admin = browser(app);
    expect((await adminSignIn(admin)).status).toBe(200);
    const response = await admin.get('/api/v1/admin/overview');

    expect(response.status).toBe(200);
    expect(adminOverviewSchema.parse(response.body)).toEqual({
      customers: 2, // administrators are not counted as customers
      contactMessages: { total: 3, unread: 2 },
    });
  });

  it('stops working as soon as the administrator is demoted or disabled', async () => {
    const app = newApp();
    await createAdminUser(adminAccount);
    const admin = browser(app);
    await adminSignIn(admin);
    expect((await admin.get('/api/v1/admin/overview')).status).toBe(200);

    await UserModel.updateOne({ email: adminAccount.email }, { role: 'customer' });
    expect((await admin.get('/api/v1/admin/overview')).status).toBe(403);

    await UserModel.updateOne({ email: adminAccount.email }, { status: 'disabled' });
    expect((await admin.get('/api/v1/admin/overview')).status).toBe(401);
  });

  it('has no way to create administrators over the web', async () => {
    const app = newApp();
    await createAdminUser(adminAccount);
    const admin = browser(app);
    await adminSignIn(admin);

    for (const path of ['/api/v1/admin/users', '/api/v1/auth/admin/register', '/api/v1/admin']) {
      const response = await admin
        .post(path)
        .send({ ...adminAccount, email: 'second@example.com' });
      expect(response.status, path).toBe(404);
    }
    expect(await UserModel.countDocuments({ role: 'admin' })).toBe(1);
  });
});

describe('signing in as an administrator', () => {
  it('works on the admin sign-in only; the customer sign-in refuses an administrator', async () => {
    const app = newApp();
    await createAdminUser(adminAccount);

    const viaCustomerRoute = await browser(app)
      .post('/api/v1/auth/login')
      .send({ email: adminAccount.email, password: adminAccount.password });
    const viaAdminRoute = await adminSignIn(browser(app));

    expect(viaCustomerRoute.status).toBe(401);
    expect(viaAdminRoute.status).toBe(200);
    expect(sessionResponseSchema.parse(viaAdminRoute.body).user).toMatchObject({
      email: adminAccount.email,
      role: 'admin',
    });
  });

  it('refuses a customer on the admin sign-in with the same answer as a wrong password', async () => {
    const app = newApp();
    await signUp(browser(app), { email: 'asha@example.com' });

    const customerOnAdminRoute = await browser(app)
      .post('/api/v1/auth/admin/login')
      .send({ email: 'asha@example.com', password: 'a-long-passphrase-9' });
    const wrongPassword = await browser(app)
      .post('/api/v1/auth/admin/login')
      .send({ email: 'asha@example.com', password: 'not-the-password' });

    expect(customerOnAdminRoute.status).toBe(401);
    expect(customerOnAdminRoute.body).toEqual(wrongPassword.body);
    expect(setCookieHeader(customerOnAdminRoute)).toBe('');
  });

  it('uses a shorter session than customers (8 hours by default, adjustable)', async () => {
    const hoursUntilExpiry = (cookie: string) =>
      (new Date(/Expires=([^;]+)/i.exec(cookie)?.[1] ?? '').getTime() - Date.now()) / 3_600_000;

    await createAdminUser(adminAccount);
    const byDefault = await adminSignIn(browser(newApp()));
    expect(hoursUntilExpiry(setCookieHeader(byDefault))).toBeGreaterThan(7.9);
    expect(hoursUntilExpiry(setCookieHeader(byDefault))).toBeLessThan(8.1);

    const shortened = await adminSignIn(browser(newApp({ ADMIN_SESSION_TTL_HOURS: '2' })));
    expect(hoursUntilExpiry(setCookieHeader(shortened))).toBeLessThan(2.1);
  });

  it('limits guessing the same way as customers', async () => {
    const app = newApp({ AUTH_RATE_LIMIT_MAX: '3' });
    await createAdminUser(adminAccount);

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const wrong = await request(app)
        .post('/api/v1/auth/admin/login')
        .send({ email: adminAccount.email, password: `wrong-${attempt}` });
      expect(wrong.status).toBe(401);
    }
    expect((await adminSignIn(browser(app))).status).toBe(429);
  });
});

describe('createAdminUser, setAdminPassword (what the admin:create script uses)', () => {
  it('creates an administrator with a hashed password', async () => {
    const user = await createAdminUser({ ...adminAccount, email: '  Boss@Example.com ' });

    expect(user).toMatchObject({ email: 'boss@example.com', role: 'admin', status: 'active' });
    const stored = await UserModel.findById(user.id).select('+passwordHash');
    expect(stored?.passwordHash).toMatch(/^\$argon2id\$/);
  });

  it('demands a stronger password than customers do (12 characters or more)', async () => {
    await expect(
      createAdminUser({ ...adminAccount, password: 'only-11-chr' }),
    ).rejects.toBeInstanceOf(ZodError);
    await expect(
      createAdminUser({ ...adminAccount, password: 'password12345' }),
    ).rejects.toBeInstanceOf(ZodError);
    expect(await UserModel.countDocuments()).toBe(0);
  });

  it('refuses an email that already has an account', async () => {
    await createAdminUser(adminAccount);
    await expect(createAdminUser(adminAccount)).rejects.toMatchObject({ status: 409 });
    await signUp(browser(newApp()), { email: 'asha@example.com' });
    await expect(
      createAdminUser({ ...adminAccount, email: 'asha@example.com' }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('sets a new password for an existing administrator, and only for administrators', async () => {
    const app = newApp();
    await createAdminUser(adminAccount);
    await setAdminPassword(adminAccount.email, 'a-brand-new-admin-pass-2');

    const oldPassword = await adminSignIn(browser(app));
    expect(oldPassword.status).toBe(401);
    const newPassword = await browser(app)
      .post('/api/v1/auth/admin/login')
      .send({ email: adminAccount.email, password: 'a-brand-new-admin-pass-2' });
    expect(newPassword.status).toBe(200);

    await expect(
      setAdminPassword('nobody@example.com', 'a-brand-new-admin-pass-2'),
    ).rejects.toMatchObject({
      status: 404,
    });
    await signUp(browser(app), { email: 'asha@example.com' });
    await expect(
      setAdminPassword('asha@example.com', 'a-brand-new-admin-pass-2'),
    ).rejects.toMatchObject({
      status: 404,
    });
  });

  it('finds an administrator by email, ignoring case', async () => {
    await createAdminUser(adminAccount);
    expect(await findAdminByEmail(' BOSS@example.com ')).not.toBeNull();
    expect(await findAdminByEmail('nobody@example.com')).toBeNull();
  });
});
