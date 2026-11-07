import { apiErrorBodySchema, projectResponseSchema, startingConfig } from '@prajzo/shared';
import { portfolioTemplate } from '@prajzo/shared/templates';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ensureCatalogueDefaults } from '../catalogue/catalogue.service';
import { SavedDesignModel } from '../designs/saved-design.model';
import { startTestDatabase } from '../../test/helpers';
import {
  newProjectApp,
  resetEverything,
  signedInAdmin,
  signedInCustomer,
  type Agent,
  type TestApp,
} from '../../test/project-helpers';
import { ProjectRequestModel } from './project-request.model';

/**
 * Sending a saved design as a project request (Phase 14). What matters most here is that a design
 * belongs to one customer and nobody else can send it, and that what was asked for is frozen: the
 * customer may change or delete the design afterwards without changing the request.
 */

const designFor = (heading: string) => {
  const config = startingConfig(portfolioTemplate);
  const hero = config.pages[0]!.sections.find((section) => section.type === 'hero')!;
  if (hero.type === 'hero') hero.content.heading = heading;
  return config;
};

/** Saves a design for this customer and gives back its id. */
async function saveDesign(customer: Agent, name: string, heading = 'My calm website') {
  const created = await customer.post('/api/v1/designs').send({ name, config: designFor(heading) });
  expect(created.status).toBe(201);
  return (created.body as { design: { id: string } }).design.id;
}

const submission = (designId: string) => ({
  designId,
  categoryKey: 'business-websites',
  packageKey: 'not-sure',
  contactPreference: 'email' as const,
  notes: 'Please keep the colours as they are.',
});

describe('sending a saved design as a project (Phase 14)', () => {
  let database: { stop: () => Promise<void> };
  let app: TestApp;

  beforeAll(async () => {
    database = await startTestDatabase();
    // The website types and packages a request is quoted against.
    await ensureCatalogueDefaults();
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
    expect((await request(app).post('/api/v1/project-requests/from-design')).status).toBe(401);
    const admin = await signedInAdmin(app);
    expect((await admin.post('/api/v1/project-requests/from-design').send({})).status).toBe(403);
  });

  it('one customer cannot send another customer’s design, and cannot tell it exists', async () => {
    const asha = await signedInCustomer(app, 'asha@example.com', 'Asha Rao');
    const designId = await saveDesign(asha, 'Asha’s portfolio');

    const kiran = await signedInCustomer(app, 'kiran@example.com', 'Kiran Patel');
    const refused = await kiran
      .post('/api/v1/project-requests/from-design')
      .send(submission(designId));

    // "Not found", exactly as for an id that was never saved: nothing is given away.
    expect(refused.status).toBe(404);
    const missing = await kiran
      .post('/api/v1/project-requests/from-design')
      .send(submission('0123456789abcdef01234567'));
    expect(missing.status).toBe(404);
    expect(apiErrorBodySchema.parse(refused.body).error.message).toBe(
      apiErrorBodySchema.parse(missing.body).error.message,
    );

    // And nothing was created for either of them.
    expect(await ProjectRequestModel.countDocuments({})).toBe(0);
  });

  it('sends the design, names the project after it and marks where it came from', async () => {
    const customer = await signedInCustomer(app);
    const designId = await saveDesign(customer, 'Studio site', 'Calm websites for busy people');

    const sent = await customer
      .post('/api/v1/project-requests/from-design')
      .send(submission(designId));
    expect(sent.status).toBe(201);
    const { project } = projectResponseSchema.parse(sent.body);
    expect(project.title).toBe('Studio site');
    expect(project.status).toBe('received');
    expect(project.reference).toMatch(/^PRZ-\d{4}-\d{4}$/);

    // The description is written from the design, so it always says what was really sent.
    const stored = await ProjectRequestModel.findOne({ reference: project.reference });
    expect(stored?.source).toBe('builder');
    expect(stored?.description).toContain('website builder');
    expect(stored?.description).toContain('Portfolio');
    expect(stored?.design?.templateKey).toBe('portfolio');
    expect(stored?.design?.name).toBe('Studio site');

    // It appears in the customer's own list of projects.
    const mine = await customer.get('/api/v1/project-requests');
    expect(mine.status).toBe(200);
    expect((mine.body as { items: { reference: string }[] }).items[0]?.reference).toBe(
      project.reference,
    );
  });

  it('keeps the design as it was, even after it is changed or deleted', async () => {
    const customer = await signedInCustomer(app);
    const designId = await saveDesign(customer, 'Before', 'The first heading');

    const sent = await customer
      .post('/api/v1/project-requests/from-design')
      .send(submission(designId));
    const { project } = projectResponseSchema.parse(sent.body);

    // The customer rewrites the design and then throws it away.
    const changed = await customer
      .patch(`/api/v1/designs/${designId}`)
      .send({ name: 'After', config: designFor('A completely different heading') });
    expect(changed.status).toBe(200);
    expect((await customer.delete(`/api/v1/designs/${designId}`)).status).toBe(204);

    // The request still holds what was actually asked for.
    const stored = await ProjectRequestModel.findOne({ reference: project.reference });
    expect(stored?.design?.name).toBe('Before');
    const config = stored?.design?.config as {
      pages: { sections: { type: string; content: { heading?: string } }[] }[];
    };
    const hero = config.pages[0]!.sections.find((section) => section.type === 'hero');
    expect(hero?.content.heading).toBe('The first heading');
    expect(stored?.title).toBe('Before');
  });

  it('refuses a website type that is not in the catalogue, and saves nothing', async () => {
    const customer = await signedInCustomer(app);
    const designId = await saveDesign(customer, 'Studio site');

    const refused = await customer
      .post('/api/v1/project-requests/from-design')
      .send({ ...submission(designId), categoryKey: 'not-a-real-category' });
    expect(refused.status).toBe(400);
    expect(apiErrorBodySchema.parse(refused.body).error.fields?.categoryKey).toBeDefined();
    expect(await ProjectRequestModel.countDocuments({})).toBe(0);
  });

  it('asks for a phone number when the customer wants to be phoned', async () => {
    const customer = await signedInCustomer(app);
    const designId = await saveDesign(customer, 'Studio site');

    const refused = await customer
      .post('/api/v1/project-requests/from-design')
      .send({ ...submission(designId), contactPreference: 'phone', phone: undefined });
    expect(refused.status).toBe(400);
    expect(apiErrorBodySchema.parse(refused.body).error.fields?.phone).toBeDefined();
  });
});
