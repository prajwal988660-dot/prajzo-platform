import { categoryListSchema, servicePackageListSchema } from '@prajzo/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startTestDatabase, testApp, testEnv } from '../../test/helpers';
import { CategoryModel, ServicePackageModel } from './catalogue.models';
import { ensureCatalogueDefaults } from './catalogue.service';

describe('service catalogue API', () => {
  let database: { stop: () => Promise<void> };

  beforeAll(async () => {
    database = await startTestDatabase();
    await ensureCatalogueDefaults();
  });

  afterAll(async () => {
    await database.stop();
  });

  it('lists the 15 website categories from the brief, in order', async () => {
    const response = await request(testApp()).get('/api/v1/categories');

    expect(response.status).toBe(200);
    const { items } = categoryListSchema.parse(response.body);
    expect(items).toHaveLength(15);
    expect(items[0]?.title).toBe('Forms and Landing Pages');
    expect(items.at(-1)?.title).toBe('Custom Website Development');
    expect(items.every((item) => item.useCases.length > 0)).toBe(true);
  });

  it('may be kept for a minute by browsers and caches, but only when it was a success', async () => {
    for (const address of ['/api/v1/categories', '/api/v1/packages']) {
      const response = await request(testApp()).get(address);
      expect(response.status, address).toBe(200);
      expect(response.headers['cache-control'], address).toBe('public, max-age=60');
    }
  });

  it('is never kept by a shared cache on a staging site, whatever it normally allows', async () => {
    const password = 'a-long-staging-password';
    const staging = testApp({ env: testEnv({ STAGING_PASSWORD: password }) });
    for (const address of ['/api/v1/categories', '/api/v1/packages']) {
      const response = await request(staging).get(address).auth('preview', password);
      expect(response.status, address).toBe(200);
      expect(response.headers['cache-control'], address).toBe('private, no-store');
    }
  });

  it('lists the three packages with their low starting prices', async () => {
    const response = await request(testApp()).get('/api/v1/packages');

    expect(response.status).toBe(200);
    const { items } = servicePackageListSchema.parse(response.body);
    expect(items.map((item) => [item.name, item.priceMode, item.priceAmountPaise])).toEqual([
      ['Quick Launch', 'from', 299_900],
      ['Professional Website', 'from', 799_900],
      ['Advanced Development', 'from', 1_999_900],
    ]);
  });

  it('hides inactive categories', async () => {
    await CategoryModel.updateOne({ key: 'resume-cv' }, { active: false });
    const response = await request(testApp()).get('/api/v1/categories');
    const { items } = categoryListSchema.parse(response.body);

    expect(items.map((item) => item.key)).not.toContain('resume-cv');
    await CategoryModel.updateOne({ key: 'resume-cv' }, { active: true });
  });

  it('does not overwrite later edits when the defaults are loaded again', async () => {
    await ServicePackageModel.updateOne({ key: 'quick-launch' }, { priceAmountPaise: 349_900 });
    const counts = await ensureCatalogueDefaults();

    expect(counts).toEqual({ categories: 15, packages: 3, templates: 1 });
    const edited = await ServicePackageModel.findOne({ key: 'quick-launch' }).lean();
    expect(edited?.priceAmountPaise).toBe(349_900);
  });

  it('refreshes the defaults only when asked to (the development seed)', async () => {
    await ensureCatalogueDefaults({ overwrite: true });
    const refreshed = await ServicePackageModel.findOne({ key: 'quick-launch' }).lean();
    expect(refreshed?.priceAmountPaise).toBe(299_900);
  });
});

describe('service catalogue API with an empty database', () => {
  let database: { stop: () => Promise<void> };

  beforeAll(async () => {
    database = await startTestDatabase();
  });

  afterAll(async () => {
    await database.stop();
  });

  it('returns empty lists rather than an error', async () => {
    const categories = await request(testApp()).get('/api/v1/categories');
    const packages = await request(testApp()).get('/api/v1/packages');

    expect(categories.status).toBe(200);
    expect(categories.body).toEqual({ items: [] });
    expect(packages.body).toEqual({ items: [] });
  });
});
