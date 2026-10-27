import { apiErrorBodySchema } from '@prajzo/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { browser } from '../../test/auth-helpers';
import { startTestDatabase } from '../../test/helpers';
import {
  newProjectApp,
  resetEverything,
  signedInAdmin,
  signedInCustomer,
} from '../../test/project-helpers';
import { ensureCatalogueDefaults } from '../catalogue/catalogue.service';

let database: { stop: () => Promise<void> };

beforeAll(async () => {
  database = await startTestDatabase();
  await ensureCatalogueDefaults();
});

afterAll(async () => {
  await database.stop();
});

beforeEach(resetEverything);

const overview = '/api/v1/admin/overview';
const second = {
  name: 'Second Admin',
  email: 'second-admin@example.com',
  password: 'another-very-long-password',
};

describe('the limit on the admin area', () => {
  it('stops an administrator who goes over, in the usual error format', async () => {
    const app = newProjectApp({ ADMIN_RATE_LIMIT_MAX: '5' });
    const admin = await signedInAdmin(app);

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      expect((await admin.get(overview)).status, `request ${attempt}`).toBe(200);
    }
    const refused = await admin.get(overview);

    expect(refused.status).toBe(429);
    expect(apiErrorBodySchema.parse(refused.body).error.code).toBe('RATE_LIMITED');
    expect(Number(refused.headers['retry-after'])).toBeGreaterThan(0);
    // Every part of the admin area shares the one allowance.
    expect((await admin.get('/api/v1/admin/project-requests')).status).toBe(429);
    expect((await admin.post('/api/v1/admin/categories').send({})).status).toBe(429);
  });

  it('counts per administrator, not per connection: a second administrator is not affected', async () => {
    const app = newProjectApp({ ADMIN_RATE_LIMIT_MAX: '3' });
    const first = await signedInAdmin(app);
    const other = await signedInAdmin(app, second);

    for (let attempt = 0; attempt < 3; attempt += 1) await first.get(overview);
    expect((await first.get(overview)).status).toBe(429);

    expect((await other.get(overview)).status).toBe(200);
  });

  it('follows the account to another device', async () => {
    const app = newProjectApp({ ADMIN_RATE_LIMIT_MAX: '3' });
    const laptop = await signedInAdmin(app);
    const phone = await signedInAdmin(app);

    for (let attempt = 0; attempt < 3; attempt += 1) await laptop.get(overview);

    expect((await phone.get(overview)).status).toBe(429);
  });

  it('cannot be used up by people who are not signed in as an administrator', async () => {
    const app = newProjectApp({ ADMIN_RATE_LIMIT_MAX: '3' });
    const admin = await signedInAdmin(app);
    const customer = await signedInCustomer(app);

    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect((await browser(app).get(overview)).status).toBe(401); // a stranger
      expect((await customer.get(overview)).status).toBe(403); // a customer
    }

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      expect((await admin.get(overview)).status, `request ${attempt}`).toBe(200);
    }
  });

  it('does not touch what customers do', async () => {
    const app = newProjectApp({ ADMIN_RATE_LIMIT_MAX: '1' });
    const admin = await signedInAdmin(app);
    const customer = await signedInCustomer(app);
    await admin.get(overview);
    expect((await admin.get(overview)).status).toBe(429);

    expect((await customer.get('/api/v1/project-requests')).status).toBe(200);
    expect((await customer.get('/api/v1/auth/me')).status).toBe(200);
  });

  it('is generous by default: an administrator working through a busy day never comes near it', async () => {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);

    for (let attempt = 0; attempt < 100; attempt += 1) {
      expect((await admin.get(overview)).status).toBe(200);
    }
  });
});
