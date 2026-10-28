import { apiErrorBodySchema } from '@prajzo/shared';
import type { Router } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createCaptureMailer } from '../../services/mailer';
import { testEnv, startTestDatabase } from '../../test/helpers';
import {
  adminAccount,
  newProjectApp,
  resetEverything,
  sendProject,
  signedInAdmin,
  signedInCustomer,
} from '../../test/project-helpers';
import { AuditLogModel } from '../audit/audit-log.model';
import { createSessions } from '../auth/session';
import { UserModel } from '../auth/user.model';
import { CategoryModel, ServicePackageModel } from '../catalogue/catalogue.models';
import { ensureCatalogueDefaults } from '../catalogue/catalogue.service';
import { ContactMessageModel } from '../contact/contact-message.model';
import { createProjectEffects } from '../projects/project-effects';
import { ProjectRequestModel } from '../projects/project-request.model';
import { adminRouter } from './admin.routes';

let database: { stop: () => Promise<void> };

beforeAll(async () => {
  database = await startTestDatabase();
  await ensureCatalogueDefaults();
});

afterAll(async () => {
  await database.stop();
});

beforeEach(resetEverything);

type Route = { method: 'get' | 'post' | 'patch' | 'put' | 'delete'; path: string };

/**
 * Lists every route in the admin router by looking inside it, so a route added later is tried
 * without anyone remembering to add it here.
 */
function discoverRoutes(router: Router): Route[] {
  const layers = (
    router as unknown as {
      stack: { route?: { path: string; methods: Record<string, boolean> } }[];
    }
  ).stack;
  return layers.flatMap((layer) =>
    layer.route
      ? Object.keys(layer.route.methods).map((method) => ({
          method: method as Route['method'],
          path: layer.route!.path,
        }))
      : [],
  );
}

const env = testEnv();
const routes = discoverRoutes(
  adminRouter({
    sessions: createSessions(env),
    effects: createProjectEffects({
      mailer: createCaptureMailer(),
      notifyEmail: 'contact@prajzo.com',
      appOrigin: env.APP_ORIGIN,
    }),
    rateLimitMax: env.ADMIN_RATE_LIMIT_MAX,
  }),
);

/** A believable value for each kind of piece in an address. */
const filledIn = (path: string) =>
  `/api/v1/admin${path
    .replace(':reference', 'PRZ-2026-0001')
    .replace(':id', '0123456789abcdef01234567')
    .replace(':key', 'business-websites')}`;

/** Everything an admin screen could change, counted, to prove that a refused request changed nothing. */
async function snapshot() {
  return JSON.stringify({
    projects: await ProjectRequestModel.find({}).lean(),
    messages: await ContactMessageModel.find({}).lean(),
    categories: await CategoryModel.find({}).sort({ key: 1 }).lean(),
    packages: await ServicePackageModel.find({}).sort({ key: 1 }).lean(),
    audit: await AuditLogModel.countDocuments(),
    users: await UserModel.countDocuments(),
  });
}

describe('the list of admin routes the tests found', () => {
  it('is complete: this is every route the admin area has', () => {
    // If you add an admin route, add it here too. It is already covered by the tests below.
    expect(routes.map(({ method, path }) => `${method.toUpperCase()} ${path}`).sort()).toEqual(
      [
        'GET /overview',
        'GET /activity',
        'GET /project-requests',
        'GET /project-requests/:reference',
        'POST /project-requests/:reference/status',
        'POST /project-requests/:reference/delivery-date',
        'POST /project-requests/:reference/notes',
        'GET /customers',
        'GET /customers/:id',
        'GET /contact-messages',
        'PATCH /contact-messages/:id',
        'GET /categories',
        'POST /categories',
        'PATCH /categories/:key',
        'GET /packages',
        'POST /packages',
        'PATCH /packages/:key',
        'GET /templates',
        'PATCH /templates/:key',
        'GET /demo-submissions',
        'PATCH /demo-submissions/:id',
      ].sort(),
    );
  });
});

describe('every admin route refuses people who are not administrators', () => {
  it('answers a visitor with 401, and changes nothing', async () => {
    const app = newProjectApp();
    // Some data that a route could change if it were not protected.
    const customer = await signedInCustomer(app);
    await sendProject(customer);
    const before = await snapshot();
    const visitor = request.agent(app);

    for (const { method, path } of routes) {
      const response = await visitor[method](filledIn(path)).send({});
      expect(response.status, `${method.toUpperCase()} ${path}`).toBe(401);
      expect(apiErrorBodySchema.parse(response.body).error.code, path).toBe('UNAUTHENTICATED');
    }
    expect(await snapshot()).toBe(before);
  });

  it('answers a signed-in customer with 403, and changes nothing', async () => {
    const app = newProjectApp();
    const customer = await signedInCustomer(app);
    const reference = await sendProject(customer);
    const before = await snapshot();

    for (const { method, path } of routes) {
      const response = await customer[method](filledIn(path)).send({});
      expect(response.status, `${method.toUpperCase()} ${path}`).toBe(403);
      expect(apiErrorBodySchema.parse(response.body).error.code, path).toBe('FORBIDDEN');
    }
    // Including the customer's own project, which they can read through their own routes only.
    const own = await customer.get(`/api/v1/admin/project-requests/${reference}`);
    expect(own.status).toBe(403);
    expect(await snapshot()).toBe(before);
  });

  it('turns away an administrator who has been disabled (401) or made a customer (403)', async () => {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);
    const get = (path: string) => admin.get(filledIn(path));
    expect((await get('/overview')).status).toBe(200);

    await UserModel.updateOne({ email: adminAccount.email }, { role: 'customer' });
    for (const { method, path } of routes) {
      const response = await admin[method](filledIn(path)).send({});
      expect(response.status, `demoted: ${method.toUpperCase()} ${path}`).toBe(403);
    }

    await UserModel.updateOne({ email: adminAccount.email }, { role: 'admin', status: 'disabled' });
    for (const { method, path } of routes) {
      const response = await admin[method](filledIn(path)).send({});
      expect(response.status, `disabled: ${method.toUpperCase()} ${path}`).toBe(401);
    }
  });

  it('refuses unknown addresses under /admin in the same way, so nothing is revealed', async () => {
    const app = newProjectApp();
    const customer = await signedInCustomer(app);
    for (const path of [
      '/api/v1/admin',
      '/api/v1/admin/',
      '/api/v1/admin/users',
      '/api/v1/admin/../admin/overview',
    ]) {
      expect((await request.agent(app).get(path)).status, `visitor ${path}`).toBe(401);
      expect((await customer.get(path)).status, `customer ${path}`).toBe(403);
    }
  });

  it('lets an administrator reach every one of them (so the checks above are really about the guard)', async () => {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);

    for (const { method, path } of routes) {
      const response = await admin[method](filledIn(path)).send({});
      // Whatever the route says about an empty request, it is not the guard saying no.
      expect([401, 403], `${method.toUpperCase()} ${path}`).not.toContain(response.status);
    }
  });

  it('never keeps a copy of what it answers, in any browser or cache', async () => {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);
    for (const { path } of routes.filter((route) => route.method === 'get')) {
      const response = await admin.get(filledIn(path));
      expect(response.headers['cache-control'], path).toBe('no-store');
    }
  });

  it('refuses a change that comes from another website, even from a signed-in administrator', async () => {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);
    const customer = await signedInCustomer(app);
    const reference = await sendProject(customer);
    const before = await snapshot();

    const response = await admin
      .post(`/api/v1/admin/project-requests/${reference}/status`)
      .set('Origin', 'https://evil.example')
      .send({ to: 'under-review' });

    expect(response.status).toBe(403);
    expect(await snapshot()).toBe(before);
  });
});
