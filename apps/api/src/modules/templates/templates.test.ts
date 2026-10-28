import {
  adminDemoSubmissionListSchema,
  adminTemplateListSchema,
  adminTemplateResponseSchema,
  apiErrorBodySchema,
  auditListSchema,
  templateListResponseSchema,
  templateResponseSchema,
} from '@prajzo/shared';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { startTestDatabase } from '../../test/helpers';
import {
  newProjectApp,
  resetEverything,
  signedInAdmin,
  signedInCustomer,
  type TestApp,
} from '../../test/project-helpers';
import { CategoryModel } from '../catalogue/catalogue.models';
import { ensureCatalogueDefaults } from '../catalogue/catalogue.service';
import { DemoSubmissionModel } from '../demos/demo-submission.model';
import { TemplateEntryModel } from './template-entry.model';

const DAY = 24 * 60 * 60 * 1000;

/** The admin form, filled in with the Portfolio listing's current words. */
async function portfolioForm(overrides: Record<string, unknown> = {}) {
  const entry = await TemplateEntryModel.findOne({ key: 'portfolio' }).lean();
  return {
    name: entry!.name,
    tagline: entry!.tagline,
    description: entry!.description,
    categories: entry!.categories,
    features: entry!.features,
    featured: entry!.featured,
    published: entry!.published,
    order: entry!.order,
    previewAlt: entry!.previewAlt,
    ...overrides,
  };
}

describe('the template catalogue (Phase 8, D-005)', () => {
  let database: { stop: () => Promise<void> };
  let app: TestApp;

  beforeAll(async () => {
    database = await startTestDatabase();
  });

  beforeEach(async () => {
    await resetEverything();
    await Promise.all([TemplateEntryModel.deleteMany({}), DemoSubmissionModel.deleteMany({})]);
    await ensureCatalogueDefaults();
    app = newProjectApp();
  });

  afterAll(async () => {
    await database.stop();
  });

  describe('for visitors', () => {
    it('lists the published templates, with category names, preview and demo address', async () => {
      const response = await request(app).get('/api/v1/templates');
      expect(response.status).toBe(200);
      const { items } = templateListResponseSchema.parse(response.body);
      expect(items.map((item) => item.key)).toEqual(['portfolio', 'business', 'event']);
      expect(items[0]).toMatchObject({
        key: 'portfolio',
        name: 'Portfolio',
        featured: true,
        demoPath: '/demo/portfolio',
        previewImage: { src: '/demo/portfolio/preview.webp' },
        categories: [
          { key: 'personal-portfolio', title: expect.any(String) as string },
          { key: 'resume-cv', title: expect.any(String) as string },
        ],
      });
      expect(items[0]!.features.length).toBeGreaterThan(3);
    });

    it('opens one template, and treats hidden or unknown ones as not found', async () => {
      const found = await request(app).get('/api/v1/templates/portfolio');
      expect(templateResponseSchema.parse(found.body).template.name).toBe('Portfolio');

      await TemplateEntryModel.updateOne({ key: 'portfolio' }, { published: false });
      expect((await request(app).get('/api/v1/templates/portfolio')).status).toBe(404);
      const left = templateListResponseSchema.parse(
        (await request(app).get('/api/v1/templates')).body,
      );
      expect(left.items.map((item) => item.key)).toEqual(['business', 'event']);
      for (const key of ['catalogue', 'nope', '__proto__', 'toString']) {
        expect((await request(app).get(`/api/v1/templates/${key}`)).status, key).toBe(404);
      }
    });

    it('leaves out a category that was hidden, and shows a renamed one by its new name', async () => {
      await CategoryModel.updateOne({ key: 'resume-cv' }, { active: false });
      await CategoryModel.updateOne({ key: 'personal-portfolio' }, { title: 'Portfolios' });
      const { template } = templateResponseSchema.parse(
        (await request(app).get('/api/v1/templates/portfolio')).body,
      );
      expect(template.categories).toEqual([{ key: 'personal-portfolio', title: 'Portfolios' }]);
    });

    it('never writes over a listing an administrator changed', async () => {
      await TemplateEntryModel.updateOne({ key: 'portfolio' }, { name: 'Folio' });
      await ensureCatalogueDefaults({ overwrite: true });
      expect((await TemplateEntryModel.findOne({ key: 'portfolio' }).lean())!.name).toBe('Folio');
    });
  });

  describe('for administrators', () => {
    it('is for administrators only', async () => {
      expect((await request(app).get('/api/v1/admin/templates')).status).toBe(401);
      const customer = await signedInCustomer(app);
      expect((await customer.get('/api/v1/admin/templates')).status).toBe(403);
      expect((await customer.get('/api/v1/admin/demo-submissions')).status).toBe(403);
    });

    it('lists every template, hidden ones too', async () => {
      await TemplateEntryModel.updateOne({ key: 'portfolio' }, { published: false });
      const admin = await signedInAdmin(app);
      const { items } = adminTemplateListSchema.parse(
        (await admin.get('/api/v1/admin/templates')).body,
      );
      expect(items.map((item) => [item.key, item.published])).toEqual([
        ['portfolio', false],
        ['business', true],
        ['event', true],
      ]);
    });

    it('changes the listing and records it in the activity log', async () => {
      const admin = await signedInAdmin(app);
      const response = await admin
        .patch('/api/v1/admin/templates/portfolio')
        .send(
          await portfolioForm({ published: false, featured: false, tagline: 'A new line here' }),
        );
      expect(response.status).toBe(200);
      expect(adminTemplateResponseSchema.parse(response.body).template).toMatchObject({
        published: false,
        featured: false,
        tagline: 'A new line here',
      });
      const { items } = auditListSchema.parse(
        (await admin.get('/api/v1/admin/activity?targetType=template')).body,
      );
      expect(items[0]).toMatchObject({
        action: 'template.updated',
        summary: 'Portfolio template: hid it, stopped featuring it, edited its listing',
        targetId: 'portfolio',
      });
      expect((await request(app).get('/api/v1/templates/portfolio')).status).toBe(404);
    });

    it('refuses categories that do not exist, and a template that is not built', async () => {
      const admin = await signedInAdmin(app);
      const wrong = await admin
        .patch('/api/v1/admin/templates/portfolio')
        .send(await portfolioForm({ categories: ['personal-portfolio', 'made-up-category'] }));
      expect(wrong.status).toBe(400);
      expect(apiErrorBodySchema.parse(wrong.body).error.fields).toEqual({
        categories: "These categories don't exist: made-up-category",
      });
      const missing = await admin
        .patch('/api/v1/admin/templates/catalogue')
        .send(await portfolioForm());
      expect(missing.status).toBe(404);
    });

    it('checks the form like the browser does', async () => {
      const admin = await signedInAdmin(app);
      const response = await admin
        .patch('/api/v1/admin/templates/portfolio')
        .send(await portfolioForm({ features: [], name: '' }));
      expect(response.status).toBe(400);
      expect(
        Object.keys(apiErrorBodySchema.parse(response.body).error.fields ?? {}).sort(),
      ).toEqual(['features', 'name']);
    });
  });

  describe('the demo inbox', () => {
    async function demoMessage(name: string, minutesAgo: number) {
      const at = new Date(Date.now() - minutesAgo * 60 * 1000);
      return DemoSubmissionModel.create({
        template: 'portfolio',
        name,
        email: `${name.toLowerCase()}@example.com`,
        message: 'I like this design very much.',
        expiresAt: new Date(at.getTime() + 7 * DAY),
        createdAt: at,
      });
    }

    it('lists demo messages newest first, filtered by status, with when each is deleted', async () => {
      await demoMessage('Older', 30);
      const newer = await demoMessage('Newer', 5);
      await DemoSubmissionModel.updateOne({ _id: newer._id }, { status: 'read' });
      const admin = await signedInAdmin(app);

      const all = adminDemoSubmissionListSchema.parse(
        (await admin.get('/api/v1/admin/demo-submissions')).body,
      );
      expect(all.items.map((item) => item.name)).toEqual(['Newer', 'Older']);
      expect(new Date(all.items[1]!.expiresAt).getTime()).toBeGreaterThan(Date.now() + 6 * DAY);

      const unread = adminDemoSubmissionListSchema.parse(
        (await admin.get('/api/v1/admin/demo-submissions?status=new')).body,
      );
      expect(unread.items.map((item) => item.name)).toEqual(['Older']);
    });

    it('marks a message read, once, in the activity log', async () => {
      const message = await demoMessage('Kiran', 1);
      const admin = await signedInAdmin(app);
      for (let time = 0; time < 2; time += 1) {
        const response = await admin
          .patch(`/api/v1/admin/demo-submissions/${message.id}`)
          .send({ status: 'read' });
        expect(response.status).toBe(200);
      }
      const { items } = auditListSchema.parse(
        (await admin.get('/api/v1/admin/activity?targetType=demo-submission')).body,
      );
      expect(items.map((item) => item.summary)).toEqual([
        'Marked the demo message from Kiran as read',
      ]);
      expect(
        (await admin.patch('/api/v1/admin/demo-submissions/nope').send({ status: 'read' })).status,
      ).toBe(404);
    });
  });
});
