import {
  adminOverviewSchema,
  apiErrorBodySchema,
  projectListSchema,
  projectResponseSchema,
  yearInIndia,
  type ProjectStatus,
} from '@prajzo/shared';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createCaptureMailer, type Mailer } from '../../services/mailer';
import { browser, customerInput, sessionsCollection, signUp } from '../../test/auth-helpers';
import { startTestDatabase, testApp, testEnv } from '../../test/helpers';
import { createAdminUser } from '../auth/auth.service';
import { UserModel } from '../auth/user.model';
import { CategoryModel } from '../catalogue/catalogue.models';
import { ensureCatalogueDefaults } from '../catalogue/catalogue.service';
import { CounterModel } from './counter.model';
import { ProjectRequestModel } from './project-request.model';
import { nextProjectReference } from './reference';

const year = yearInIndia();

const projectBody = {
  title: 'Website for my studio',
  categoryKey: 'business-websites',
  packageKey: 'professional-website',
  description:
    'A simple five-page website for my photography studio, with a gallery and a contact form.',
  features: ['gallery', 'contact-form'],
  integrations: ['google-maps'],
  contactPreference: 'email',
};

let database: { stop: () => Promise<void> };

beforeAll(async () => {
  database = await startTestDatabase();
  await ensureCatalogueDefaults();
});

afterAll(async () => {
  await database.stop();
});

beforeEach(async () => {
  await Promise.all([
    UserModel.deleteMany({}),
    ProjectRequestModel.deleteMany({}),
    CounterModel.deleteMany({}),
    sessionsCollection().deleteMany({}),
    CategoryModel.updateMany({}, { active: true }),
  ]);
});

/** A fresh app, so limits and sessions from other tests can't interfere. */
function newApp(overrides: Record<string, string> = {}, mailer: Mailer = createCaptureMailer()) {
  return testApp({
    env: testEnv({
      AUTH_RATE_LIMIT_MAX: '100',
      PROJECT_REQUEST_RATE_LIMIT_MAX: '100',
      ...overrides,
    }),
    mailer,
  });
}

type Agent = ReturnType<typeof browser>;

async function signedInCustomer(app: ReturnType<typeof newApp>, email = customerInput.email) {
  const agent = browser(app);
  await signUp(agent, { email });
  return agent;
}

const send = (agent: Agent, overrides: Record<string, unknown> = {}) =>
  agent.post('/api/v1/project-requests').send({ ...projectBody, ...overrides });

/** Sends a request and returns its reference number. */
async function sendAndGetReference(agent: Agent, overrides: Record<string, unknown> = {}) {
  const response = await send(agent, overrides);
  expect(response.status, JSON.stringify(response.body)).toBe(201);
  return projectResponseSchema.parse(response.body).project.reference;
}

describe('sending a project request', () => {
  it('saves it with a reference number and the status "Request Received"', async () => {
    const app = newApp();
    const agent = await signedInCustomer(app);

    const response = await send(agent);

    expect(response.status).toBe(201);
    const { project } = projectResponseSchema.parse(response.body);
    expect(project).toMatchObject({
      reference: `PRZ-${year}-0001`,
      title: 'Website for my studio',
      status: 'received',
      categoryKey: 'business-websites',
      categoryTitle: 'Business Websites',
      packageKey: 'professional-website',
      packageName: 'Professional Website',
      features: ['gallery', 'contact-form'],
      integrations: ['google-maps'],
      contactPreference: 'email',
      allowedActions: ['cancel'],
    });
    expect(project.timeline).toHaveLength(1);
    expect(project.timeline[0]).toMatchObject({
      kind: 'status',
      from: null,
      to: 'received',
      by: 'customer',
    });
    expect(project.quote).toBeNull();
    expect(project.confirmedDeliveryDate).toBeNull();
    expect(project.revisions).toBeNull();

    const stored = await ProjectRequestModel.findOne({ reference: project.reference });
    const owner = await UserModel.findOne({ email: customerInput.email });
    expect(stored?.customerId.toString()).toBe(owner?.id);
    expect(stored?.source).toBe('start-form');
    expect(stored?.contact.name).toBe('Asha Rao');
    expect(stored?.contact.email).toBe('asha@example.com');
  });

  it('gives each request the next number', async () => {
    const app = newApp();
    const agent = await signedInCustomer(app);
    const references = [
      await sendAndGetReference(agent),
      await sendAndGetReference(agent),
      await sendAndGetReference(agent),
    ];
    expect(references).toEqual([`PRZ-${year}-0001`, `PRZ-${year}-0002`, `PRZ-${year}-0003`]);
  });

  it('emails a confirmation to the customer and a notification to Prajzo', async () => {
    const mailer = createCaptureMailer();
    const app = newApp({ ADMIN_NOTIFY_EMAIL: 'studio@example.com' }, mailer);
    const agent = await signedInCustomer(app);

    const reference = await sendAndGetReference(agent, {
      contactPreference: 'whatsapp',
      phone: '+91 98866 07720',
      notes: 'Please message after 5 pm.',
    });

    expect(mailer.sent).toHaveLength(2);
    const toCustomer = mailer.sent.find((mail) => mail.to === 'asha@example.com');
    const toPrajzo = mailer.sent.find((mail) => mail.to === 'studio@example.com');

    expect(toCustomer?.subject).toContain(reference);
    expect(toCustomer?.text).toContain(`http://localhost:5173/account/projects/${reference}`);
    expect(toCustomer?.text).toContain('Nothing starts until you have accepted the quote');
    expect(toCustomer?.text).not.toMatch(/within \d+ (hours|days)/i); // no promised timings

    expect(toPrajzo?.subject).toBe(`New project request ${reference}: Website for my studio`);
    expect(toPrajzo?.replyTo).toBe('asha@example.com');
    expect(toPrajzo?.text).toContain('Asha Rao <asha@example.com>');
    expect(toPrajzo?.text).toContain('+91 98866 07720');
    expect(toPrajzo?.text).toContain('WhatsApp');
    expect(toPrajzo?.text).toContain('Photo or video gallery');
    expect(toPrajzo?.text).toContain('Please message after 5 pm.');
  });

  it('sends the notification to the public contact address unless told otherwise', async () => {
    const mailer = createCaptureMailer();
    const agent = await signedInCustomer(newApp({}, mailer));
    await sendAndGetReference(agent);
    expect(mailer.sent.map((mail) => mail.to).sort()).toEqual([
      'asha@example.com',
      'contact@prajzo.com',
    ]);
  });

  it("still saves the request when an email can't be sent", async () => {
    const failing: Mailer = { send: () => Promise.reject(new Error('The mail server is down')) };
    const agent = await signedInCustomer(newApp({}, failing));

    const response = await send(agent);

    expect(response.status).toBe(201);
    expect(await ProjectRequestModel.countDocuments()).toBe(1);
  });

  it('accepts "something else" and "not sure yet", and leaves the package out when not chosen', async () => {
    const agent = await signedInCustomer(newApp());

    const other = projectResponseSchema.parse(
      (await send(agent, { categoryKey: 'other', packageKey: 'not-sure' })).body,
    ).project;
    expect(other).toMatchObject({
      categoryKey: 'other',
      categoryTitle: 'Something else',
      packageKey: null,
      packageName: null,
    });

    const { packageKey: _left, ...withoutPackage } = projectBody;
    const none = projectResponseSchema.parse(
      (await agent.post('/api/v1/project-requests').send(withoutPackage)).body,
    ).project;
    expect(none.packageKey).toBeNull();
  });

  it('ignores anything a customer must not set: status, reference, owner, price, delivery date', async () => {
    const app = newApp();
    const agent = await signedInCustomer(app);
    const someoneElse = await UserModel.create({
      email: 'other@example.com',
      name: 'Other',
      passwordHash: 'x',
    });

    const response = await send(agent, {
      status: 'completed',
      reference: 'PRZ-2000-9999',
      customerId: someoneElse.id,
      source: 'builder',
      quote: { amount: 1 },
      price: 1,
      confirmedDeliveryDate: '2026-12-01',
      statusHistory: [{ to: 'completed', by: 'admin' }],
      adminNotes: ['approved already'],
    });

    expect(response.status).toBe(201);
    const { project } = projectResponseSchema.parse(response.body);
    expect(project.status).toBe('received');
    expect(project.reference).toBe(`PRZ-${year}-0001`);
    expect(project.timeline).toHaveLength(1);

    const stored = (await ProjectRequestModel.findOne().lean())!;
    const owner = await UserModel.findOne({ email: customerInput.email });
    expect(stored.customerId.toString()).toBe(owner?.id);
    expect(stored.source).toBe('start-form');
    expect(Object.keys(stored)).not.toEqual(
      expect.arrayContaining(['quote', 'price', 'confirmedDeliveryDate', 'adminNotes']),
    );
  });

  describe('refuses what does not add up', () => {
    it('a website type or package that does not exist, without using up a reference number', async () => {
      const agent = await signedInCustomer(newApp());

      const response = await send(agent, { categoryKey: 'spaceship', packageKey: 'platinum' });

      expect(response.status).toBe(400);
      expect(apiErrorBodySchema.parse(response.body).error).toMatchObject({
        code: 'VALIDATION_FAILED',
        fields: {
          categoryKey: 'Choose a website type from the list',
          packageKey: 'Choose a package from the list',
        },
      });
      expect(await ProjectRequestModel.countDocuments()).toBe(0);
      expect(await CounterModel.countDocuments()).toBe(0);
    });

    it('a website type that has been switched off', async () => {
      await CategoryModel.updateOne({ key: 'business-websites' }, { active: false });
      const agent = await signedInCustomer(newApp());
      const response = await send(agent);
      expect(response.status).toBe(400);
      expect(apiErrorBodySchema.parse(response.body).error.fields).toHaveProperty('categoryKey');
    });

    it('missing and invalid details, field by field', async () => {
      const agent = await signedInCustomer(newApp());

      const empty = await agent.post('/api/v1/project-requests').send({});
      expect(empty.status).toBe(400);
      const emptyFields = apiErrorBodySchema.parse(empty.body).error.fields ?? {};
      expect(Object.keys(emptyFields).sort()).toEqual(['categoryKey', 'description', 'title']);

      const bad = await send(agent, {
        title: 'ab',
        description: 'too short',
        features: ['teleportation'],
        preferredDate: '2020-01-01',
        contactPreference: 'phone',
      });
      const badFields = apiErrorBodySchema.parse(bad.body).error.fields ?? {};
      expect(badFields.title).toMatch(/at least 3/);
      expect(badFields.description).toMatch(/at least 30/);
      expect(badFields['features.0']).toBeDefined();
      expect(badFields.preferredDate).toBe("Choose a date that hasn't passed");
      expect(badFields.phone).toMatch(/Add a phone number/);
      expect(await ProjectRequestModel.countDocuments()).toBe(0);
    });

    it('a body that is not an object', async () => {
      const agent = await signedInCustomer(newApp());
      for (const body of ['"text"', '[]', 'null', '123']) {
        const response = await agent
          .post('/api/v1/project-requests')
          .set('Content-Type', 'application/json')
          .send(body);
        expect(response.status, body).toBe(400);
      }
    });
  });

  describe('who may send one', () => {
    it('only a signed-in customer', async () => {
      const app = newApp();
      const visitor = await send(request.agent(app));
      expect(visitor.status).toBe(401);
      expect(apiErrorBodySchema.parse(visitor.body).error.code).toBe('UNAUTHENTICATED');
      expect(await ProjectRequestModel.countDocuments()).toBe(0);
    });

    it('not an administrator', async () => {
      const app = newApp();
      await createAdminUser({
        name: 'Boss',
        email: 'boss@example.com',
        password: 'a-very-long-admin-password',
      });
      const admin = browser(app);
      const signedIn = await admin
        .post('/api/v1/auth/admin/login')
        .send({ email: 'boss@example.com', password: 'a-very-long-admin-password' });
      expect(signedIn.status).toBe(200);

      const response = await send(admin);

      expect(response.status).toBe(403);
      expect(apiErrorBodySchema.parse(response.body).error.code).toBe('FORBIDDEN');
      expect(await ProjectRequestModel.countDocuments()).toBe(0);
    });

    it('not an account that has been disabled', async () => {
      const app = newApp();
      const agent = await signedInCustomer(app);
      await UserModel.updateOne({ email: customerInput.email }, { status: 'disabled' });
      expect((await send(agent)).status).toBe(401);
    });

    it('not when the request came from another website', async () => {
      const app = newApp();
      const agent = await signedInCustomer(app);
      const response = await send(agent).set('Origin', 'https://evil.example');
      expect(response.status).toBe(403);
      expect(await ProjectRequestModel.countDocuments()).toBe(0);
    });
  });

  it('limits how many one customer can send in an hour, counting each customer separately', async () => {
    const app = newApp({ PROJECT_REQUEST_RATE_LIMIT_MAX: '2' });
    const first = await signedInCustomer(app, 'first@example.com');
    const second = await signedInCustomer(app, 'second@example.com');

    expect((await send(first)).status).toBe(201);
    expect((await send(first)).status).toBe(201);
    const blocked = await send(first);
    expect(blocked.status).toBe(429);
    expect(apiErrorBodySchema.parse(blocked.body).error.code).toBe('RATE_LIMITED');

    expect((await send(second)).status).toBe(201); // someone else is not held up
    expect(await ProjectRequestModel.countDocuments()).toBe(3);
  });
});

describe('reference numbers', () => {
  it('stay unique when many requests arrive at the same moment', async () => {
    const references = await Promise.all(Array.from({ length: 40 }, () => nextProjectReference()));

    expect(new Set(references).size).toBe(40);
    const numbers = references
      .map((reference) => Number(reference.split('-')[2]))
      .sort((a, b) => a - b);
    expect(numbers).toEqual(Array.from({ length: 40 }, (_, index) => index + 1));
  });

  it('stay unique when many customers send requests at the same moment', async () => {
    const app = newApp();
    const agents = await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        signedInCustomer(app, `customer${index}@example.com`),
      ),
    );

    const responses = await Promise.all(agents.map((agent) => send(agent)));

    expect(responses.map((response) => response.status)).toEqual(Array(12).fill(201));
    const references = responses.map(
      (response) => projectResponseSchema.parse(response.body).project.reference,
    );
    expect(new Set(references).size).toBe(12);
    expect(await ProjectRequestModel.countDocuments()).toBe(12);
  });

  it('start again each year, by India time', async () => {
    expect(await nextProjectReference(new Date('2026-12-31T18:29:59Z'))).toBe('PRZ-2026-0001');
    expect(await nextProjectReference(new Date('2026-12-31T18:29:59Z'))).toBe('PRZ-2026-0002');
    expect(await nextProjectReference(new Date('2026-12-31T18:30:00Z'))).toBe('PRZ-2027-0001');
  });

  it('keep counting past 9999', async () => {
    await CounterModel.create({ _id: `projectRequest:${year}`, seq: 9998 });
    expect(await nextProjectReference()).toBe(`PRZ-${year}-9999`);
    expect(await nextProjectReference()).toBe(`PRZ-${year}-10000`);
  });
});

describe('reading your projects', () => {
  it('lists only your own, newest first, a page at a time', async () => {
    const app = newApp();
    const asha = await signedInCustomer(app, 'asha@example.com');
    const ravi = await signedInCustomer(app, 'ravi@example.com');
    const first = await sendAndGetReference(asha, { title: 'First project' });
    await sendAndGetReference(ravi, { title: "Ravi's project" });
    const second = await sendAndGetReference(asha, { title: 'Second project' });
    const third = await sendAndGetReference(asha, { title: 'Third project' });

    const all = projectListSchema.parse((await asha.get('/api/v1/project-requests')).body);
    expect(all.total).toBe(3);
    expect(all.items.map((item) => item.reference)).toEqual([third, second, first]);
    expect(all.items.map((item) => item.title)).not.toContain("Ravi's project");

    const page1 = projectListSchema.parse(
      (await asha.get('/api/v1/project-requests?limit=2&page=1')).body,
    );
    const page2 = projectListSchema.parse(
      (await asha.get('/api/v1/project-requests?limit=2&page=2')).body,
    );
    expect(page1).toMatchObject({ page: 1, limit: 2, total: 3 });
    expect(page1.items.map((item) => item.reference)).toEqual([third, second]);
    expect(page2.items.map((item) => item.reference)).toEqual([first]);

    const beyond = projectListSchema.parse(
      (await asha.get('/api/v1/project-requests?page=9')).body,
    );
    expect(beyond.items).toEqual([]);
    expect(beyond.total).toBe(3);
  });

  it('lists a short summary, not the whole request', async () => {
    const agent = await signedInCustomer(newApp());
    await sendAndGetReference(agent, { notes: 'private notes' });
    const body = (await agent.get('/api/v1/project-requests')).body as { items: object[] };
    expect(Object.keys(body.items[0] ?? {}).sort()).toEqual(
      ['categoryTitle', 'createdAt', 'reference', 'status', 'title', 'updatedAt'].sort(),
    );
  });

  it('refuses a nonsense page or page size', async () => {
    const agent = await signedInCustomer(newApp());
    for (const query of ['page=0', 'page=abc', 'limit=0', 'limit=51', 'page=1.5']) {
      const response = await agent.get(`/api/v1/project-requests?${query}`);
      expect(response.status, query).toBe(400);
    }
  });

  it('shows one project in full, with its status timeline', async () => {
    const agent = await signedInCustomer(newApp());
    const reference = await sendAndGetReference(agent, { notes: 'A note for you' });

    const response = await agent.get(`/api/v1/project-requests/${reference}`);

    expect(response.status).toBe(200);
    const { project } = projectResponseSchema.parse(response.body);
    expect(project).toMatchObject({
      reference,
      title: 'Website for my studio',
      description: projectBody.description,
      notes: 'A note for you',
      preferredDate: null,
      status: 'received',
    });
    expect(
      project.timeline.map((entry) => (entry.kind === 'status' ? entry.to : entry.kind)),
    ).toEqual(['received']);
  });

  it("never shows another customer's project, and can't tell you whether it exists", async () => {
    const app = newApp();
    const asha = await signedInCustomer(app, 'asha@example.com');
    const ravi = await signedInCustomer(app, 'ravi@example.com');
    const ashasReference = await sendAndGetReference(asha);

    const theirs = await ravi.get(`/api/v1/project-requests/${ashasReference}`);
    const missing = await ravi.get(`/api/v1/project-requests/PRZ-${year}-4242`);

    expect(theirs.status).toBe(404);
    expect(missing.status).toBe(404);
    expect(theirs.body).toEqual(missing.body); // the same answer for both
    expect(JSON.stringify(theirs.body)).not.toContain(ashasReference);
  });

  it('answers "not found" for anything that is not a reference number', async () => {
    const agent = await signedInCustomer(newApp());
    for (const reference of [
      'PRZ-1',
      'prz-2026-0001',
      'PRZ-2026-0001%20',
      'abc',
      'PRZ-2026-0001;x',
    ]) {
      const response = await agent.get(`/api/v1/project-requests/${reference}`);
      expect(response.status, reference).toBe(404);
    }
  });

  it('sends nothing internal and tells browsers not to keep a copy', async () => {
    const agent = await signedInCustomer(newApp());
    const reference = await sendAndGetReference(agent);

    for (const path of ['', `/${reference}`]) {
      const response = await agent.get(`/api/v1/project-requests${path}`);
      expect(response.headers['cache-control']).toBe('no-store');
      expect(JSON.stringify(response.body)).not.toMatch(
        /customerId|userId|_id|__v|adminNotes|passwordHash|statusHistory/,
      );
    }
  });

  it('needs a signed-in customer', async () => {
    const app = newApp();
    const agent = await signedInCustomer(app);
    const reference = await sendAndGetReference(agent);
    const visitor = request.agent(app);

    expect((await visitor.get('/api/v1/project-requests')).status).toBe(401);
    expect((await visitor.get(`/api/v1/project-requests/${reference}`)).status).toBe(401);

    await createAdminUser({
      name: 'Boss',
      email: 'boss@example.com',
      password: 'a-very-long-admin-password',
    });
    const admin = browser(app);
    await admin
      .post('/api/v1/auth/admin/login')
      .send({ email: 'boss@example.com', password: 'a-very-long-admin-password' });
    expect((await admin.get('/api/v1/project-requests')).status).toBe(403);
    expect((await admin.get(`/api/v1/project-requests/${reference}`)).status).toBe(403);
  });
});

describe('cancelling a project', () => {
  const cancel = (agent: Agent, reference: string, body: Record<string, unknown> = {}) =>
    agent.post(`/api/v1/project-requests/${reference}/actions`).send({ action: 'cancel', ...body });

  it('cancels a new request, records who did it and why, and offers nothing more to do', async () => {
    const agent = await signedInCustomer(newApp());
    const reference = await sendAndGetReference(agent);

    const response = await cancel(agent, reference, { note: '  I changed my mind  ' });

    expect(response.status).toBe(200);
    const { project } = projectResponseSchema.parse(response.body);
    expect(project.status).toBe('cancelled');
    expect(project.allowedActions).toEqual([]);
    expect(project.timeline).toHaveLength(2);
    expect(project.timeline[1]).toMatchObject({
      kind: 'status',
      from: 'received',
      to: 'cancelled',
      by: 'customer',
      note: 'I changed my mind',
    });

    const list = projectListSchema.parse((await agent.get('/api/v1/project-requests')).body);
    expect(list.items[0]?.status).toBe('cancelled');
  });

  it('works without a reason', async () => {
    const agent = await signedInCustomer(newApp());
    const reference = await sendAndGetReference(agent);
    const { project } = projectResponseSchema.parse((await cancel(agent, reference)).body);
    expect(project.timeline[1]).toMatchObject({ kind: 'status', note: null });
  });

  it('cannot be done twice', async () => {
    const agent = await signedInCustomer(newApp());
    const reference = await sendAndGetReference(agent);
    expect((await cancel(agent, reference)).status).toBe(200);

    const again = await cancel(agent, reference);

    expect(again.status).toBe(409);
    expect(apiErrorBodySchema.parse(again.body).error.code).toBe('CONFLICT');
    expect((await ProjectRequestModel.findOne({ reference }))?.statusHistory).toHaveLength(2);
  });

  describe('only while the project is still early', () => {
    const cancellable: ProjectStatus[] = ['received', 'awaiting-information', 'quote-sent'];
    const notCancellable: ProjectStatus[] = [
      'under-review',
      'approved',
      'in-development',
      'testing',
      'awaiting-review',
      'revision-requested',
      'completed',
      'cancelled',
    ];

    it.each(cancellable)('allows it when the status is "%s"', async (status) => {
      const agent = await signedInCustomer(newApp());
      const reference = await sendAndGetReference(agent);
      await ProjectRequestModel.updateOne({ reference }, { status });

      const detail = projectResponseSchema.parse(
        (await agent.get(`/api/v1/project-requests/${reference}`)).body,
      ).project;
      expect(detail.allowedActions).toContain('cancel');

      const response = await cancel(agent, reference);
      expect(response.status).toBe(200);
      expect(projectResponseSchema.parse(response.body).project.status).toBe('cancelled');
    });

    it.each(notCancellable)('refuses it when the status is "%s"', async (status) => {
      const agent = await signedInCustomer(newApp());
      const reference = await sendAndGetReference(agent);
      await ProjectRequestModel.updateOne({ reference }, { status });

      const detail = projectResponseSchema.parse(
        (await agent.get(`/api/v1/project-requests/${reference}`)).body,
      ).project;
      expect(detail.allowedActions).not.toContain('cancel');

      const response = await cancel(agent, reference);
      expect(response.status).toBe(409);
      expect((await ProjectRequestModel.findOne({ reference }))?.status).toBe(status);
    });
  });

  it("cannot cancel someone else's project", async () => {
    const app = newApp();
    const asha = await signedInCustomer(app, 'asha@example.com');
    const ravi = await signedInCustomer(app, 'ravi@example.com');
    const reference = await sendAndGetReference(asha);

    const response = await cancel(ravi, reference);

    expect(response.status).toBe(404);
    expect((await ProjectRequestModel.findOne({ reference }))?.status).toBe('received');
  });

  it('refuses any action but cancelling, and a reason that is far too long', async () => {
    const agent = await signedInCustomer(newApp());
    const reference = await sendAndGetReference(agent);
    const url = `/api/v1/project-requests/${reference}/actions`;

    for (const action of ['approve', 'complete', 'refund', 'under-review', '', undefined]) {
      const response = await agent.post(url).send({ action });
      expect(response.status, String(action)).toBe(400);
    }
    expect((await cancel(agent, reference, { note: 'x'.repeat(501) })).status).toBe(400);
    expect((await ProjectRequestModel.findOne({ reference }))?.status).toBe('received');
  });

  it('lets exactly one of two simultaneous cancellations win', async () => {
    const agent = await signedInCustomer(newApp());
    const reference = await sendAndGetReference(agent);

    const results = await Promise.all([cancel(agent, reference), cancel(agent, reference)]);

    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    const stored = await ProjectRequestModel.findOne({ reference });
    expect(stored?.statusHistory.filter((entry) => entry.to === 'cancelled')).toHaveLength(1);
  });

  it('needs a signed-in customer', async () => {
    const app = newApp();
    const agent = await signedInCustomer(app);
    const reference = await sendAndGetReference(agent);
    expect((await cancel(request.agent(app), reference)).status).toBe(401);
    expect((await ProjectRequestModel.findOne({ reference }))?.status).toBe('received');
  });
});

describe('what the admin overview counts', () => {
  it('counts every project request, and how many are still new', async () => {
    const app = newApp();
    await createAdminUser({
      name: 'Boss',
      email: 'boss@example.com',
      password: 'a-very-long-admin-password',
    });
    const agent = await signedInCustomer(app);
    await sendAndGetReference(agent);
    await sendAndGetReference(agent);
    const third = await sendAndGetReference(agent);
    await ProjectRequestModel.updateOne({ reference: third }, { status: 'under-review' });

    const admin = browser(app);
    await admin
      .post('/api/v1/auth/admin/login')
      .send({ email: 'boss@example.com', password: 'a-very-long-admin-password' });
    const overview = adminOverviewSchema.parse((await admin.get('/api/v1/admin/overview')).body);

    expect(overview.projectRequests).toMatchObject({ total: 3, received: 2 });
    expect(overview.projectRequests.byStatus).toMatchObject({
      received: 2,
      'under-review': 1,
      cancelled: 0,
    });
  });
});
