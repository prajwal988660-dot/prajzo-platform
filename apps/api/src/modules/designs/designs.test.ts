import {
  apiErrorBodySchema,
  MAX_SAVED_DESIGNS,
  savedDesignListSchema,
  savedDesignResponseSchema,
  startingConfig,
} from '@prajzo/shared';
import { portfolioTemplate } from '@prajzo/shared/templates';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { startTestDatabase, testEnv } from '../../test/helpers';
import {
  newProjectApp,
  resetEverything,
  signedInAdmin,
  signedInCustomer,
  type TestApp,
} from '../../test/project-helpers';
import { SavedDesignModel } from './saved-design.model';

/** The Portfolio demo with a new heading and colour, as the builder would send it. */
function editedPortfolio(heading = 'Hello, I build calm apps.') {
  const config = startingConfig(portfolioTemplate);
  const hero = config.pages[0]!.sections.find((section) => section.type === 'hero')!;
  if (hero.type === 'hero') hero.content.heading = heading;
  config.design.colors.primary = '#0f766e';
  return config;
}

describe('saved designs (Phase 9)', () => {
  let database: { stop: () => Promise<void> };
  let app: TestApp;

  beforeAll(async () => {
    database = await startTestDatabase();
  });

  beforeEach(async () => {
    await resetEverything();
    await SavedDesignModel.deleteMany({});
    app = newProjectApp();
  });

  afterAll(async () => {
    await database.stop();
  });

  it('is for signed-in customers only', async () => {
    expect((await request(app).get('/api/v1/designs')).status).toBe(401);
    const admin = await signedInAdmin(app);
    expect((await admin.get('/api/v1/designs')).status).toBe(403);
  });

  it('saves a design, reads it back exactly, renames it and saves new content', async () => {
    const customer = await signedInCustomer(app);
    const created = await customer
      .post('/api/v1/designs')
      .send({ name: 'My portfolio', config: editedPortfolio() });
    expect(created.status).toBe(201);
    const { design } = savedDesignResponseSchema.parse(created.body);
    expect(design).toMatchObject({
      name: 'My portfolio',
      templateKey: 'portfolio',
      templateName: 'Portfolio',
    });
    expect(design.config).toEqual(editedPortfolio());

    const read = savedDesignResponseSchema.parse(
      (await customer.get(`/api/v1/designs/${design.id}`)).body,
    );
    expect(read.design.config.design.colors.primary).toBe('#0f766e');

    const renamed = await customer
      .patch(`/api/v1/designs/${design.id}`)
      .send({ name: 'Portfolio v2' });
    expect(savedDesignResponseSchema.parse(renamed.body).design.name).toBe('Portfolio v2');

    const changed = await customer
      .patch(`/api/v1/designs/${design.id}`)
      .send({ config: editedPortfolio('A new heading') });
    const hero = savedDesignResponseSchema
      .parse(changed.body)
      .design.config.pages[0]!.sections.find((section) => section.type === 'hero');
    expect(hero?.type === 'hero' && hero.content.heading).toBe('A new heading');
  });

  it('lists only my designs, newest change first, without their content', async () => {
    const asha = await signedInCustomer(app, 'asha@example.com');
    const ravi = await signedInCustomer(app, 'ravi@example.com', 'Ravi Kumar');
    await asha.post('/api/v1/designs').send({ name: 'First', config: editedPortfolio() });
    await asha.post('/api/v1/designs').send({ name: 'Second', config: editedPortfolio() });
    await ravi.post('/api/v1/designs').send({ name: 'Ravi’s', config: editedPortfolio() });

    const response = await asha.get('/api/v1/designs');
    const { items } = savedDesignListSchema.parse(response.body);
    expect(items.map((item) => item.name)).toEqual(['Second', 'First']);
    expect(JSON.stringify(response.body)).not.toContain('pages');
  });

  it('never shows, changes or deletes someone else’s design: it is simply not found', async () => {
    const asha = await signedInCustomer(app, 'asha@example.com');
    const ravi = await signedInCustomer(app, 'ravi@example.com', 'Ravi Kumar');
    const { design } = savedDesignResponseSchema.parse(
      (await asha.post('/api/v1/designs').send({ name: 'Mine', config: editedPortfolio() })).body,
    );
    const attempts = [
      ravi.get(`/api/v1/designs/${design.id}`),
      ravi.patch(`/api/v1/designs/${design.id}`).send({ name: 'Taken' }),
      ravi.post(`/api/v1/designs/${design.id}/duplicate`),
      ravi.delete(`/api/v1/designs/${design.id}`),
      ravi.get('/api/v1/designs/not-an-id'),
    ];
    for (const response of await Promise.all(attempts)) {
      expect(response.status).toBe(404);
      expect(apiErrorBodySchema.parse(response.body).error.message).toBe(
        "We couldn't find that design.",
      );
    }
    expect((await SavedDesignModel.findById(design.id).lean())?.name).toBe('Mine');
  });

  it('refuses a design that breaks the rules, saying where', async () => {
    const customer = await signedInCustomer(app);
    const broken = editedPortfolio();
    const hero = broken.pages[0]!.sections.find((section) => section.type === 'hero')!;
    if (hero.type === 'hero') {
      hero.content.primaryAction = { label: 'Click', href: 'javascript:alert(1)' };
    }
    broken.design.theme = 'neon';

    const response = await customer
      .post('/api/v1/designs')
      .send({ name: 'Broken', config: broken });
    expect(response.status).toBe(400);
    const fields = apiErrorBodySchema.parse(response.body).error.fields ?? {};
    expect(Object.keys(fields)).toContain('config.pages.0.sections.1.content.primaryAction.href');
    expect(await SavedDesignModel.countDocuments()).toBe(0);

    const themed = editedPortfolio();
    themed.design.theme = 'neon';
    const second = await customer.post('/api/v1/designs').send({ name: 'Neon', config: themed });
    expect(apiErrorBodySchema.parse(second.body).error.fields).toEqual({
      'config.design.theme': 'Choose one of this template’s colour themes',
    });
  });

  it('refuses a design for a template that does not exist, and never switches a design’s template', async () => {
    const customer = await signedInCustomer(app);
    for (const key of ['business', 'nope', '__proto__']) {
      const config = { ...editedPortfolio(), template: { key, version: 1 } };
      const response = await customer.post('/api/v1/designs').send({ name: 'X', config });
      expect(response.status, key).toBe(400);
    }
    expect(
      (await customer.post('/api/v1/designs').send({ name: 'X', config: 'nothing' })).status,
    ).toBe(400);
  });

  it('duplicates and deletes', async () => {
    const customer = await signedInCustomer(app);
    const { design } = savedDesignResponseSchema.parse(
      (await customer.post('/api/v1/designs').send({ name: 'Original', config: editedPortfolio() }))
        .body,
    );
    const copy = await customer.post(`/api/v1/designs/${design.id}/duplicate`);
    expect(copy.status).toBe(201);
    const duplicate = savedDesignResponseSchema.parse(copy.body).design;
    expect(duplicate.name).toBe('Original (copy)');
    expect(duplicate.config).toEqual(design.config);
    expect(duplicate.id).not.toBe(design.id);

    expect((await customer.delete(`/api/v1/designs/${design.id}`)).status).toBe(204);
    expect((await customer.get(`/api/v1/designs/${design.id}`)).status).toBe(404);
    expect(
      savedDesignListSchema.parse((await customer.get('/api/v1/designs')).body).items,
    ).toHaveLength(1);
  });

  it(`keeps at most ${String(MAX_SAVED_DESIGNS)} designs per customer`, async () => {
    const customer = await signedInCustomer(app);
    const user = await SavedDesignModel.db
      .collection('users')
      .findOne({ email: 'asha@example.com' });
    await SavedDesignModel.insertMany(
      Array.from({ length: MAX_SAVED_DESIGNS }, (_, index) => ({
        owner: user!._id,
        name: `Design ${String(index)}`,
        templateKey: 'portfolio',
        templateVersion: 1,
        config: editedPortfolio(),
      })),
    );
    const response = await customer
      .post('/api/v1/designs')
      .send({ name: 'One more', config: editedPortfolio() });
    expect(response.status).toBe(409);
    expect(apiErrorBodySchema.parse(response.body).error.message).toContain('Delete one');
  });

  it('limits how often one customer can save', async () => {
    const limited = newProjectApp({ DESIGN_SAVE_RATE_LIMIT_MAX: '2' });
    const customer = await signedInCustomer(limited);
    const save = () =>
      customer.post('/api/v1/designs').send({ name: 'X', config: editedPortfolio() });
    expect((await save()).status).toBe(201);
    expect((await save()).status).toBe(201);
    expect((await save()).status).toBe(429);
    // Reading is not limited.
    expect((await customer.get('/api/v1/designs')).status).toBe(200);
    expect(testEnv({ DESIGN_SAVE_RATE_LIMIT_MAX: '2' }).DESIGN_SAVE_RATE_LIMIT_MAX).toBe(2);
  });
});
