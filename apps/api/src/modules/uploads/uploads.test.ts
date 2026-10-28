import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { apiErrorBodySchema, startingConfig, uploadResponseSchema } from '@prajzo/shared';
import { portfolioTemplate } from '@prajzo/shared/templates';
import sharp from 'sharp';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { startTestDatabase } from '../../test/helpers';
import {
  newProjectApp,
  resetEverything,
  signedInAdmin,
  signedInCustomer,
  type TestApp,
} from '../../test/project-helpers';
import { SavedDesignModel } from '../designs/saved-design.model';
import { UploadModel } from './upload.model';

const photo = () =>
  sharp({ create: { width: 800, height: 600, channels: 3, background: '#c4472a' } })
    .jpeg()
    .toBuffer();

describe('picture uploads (D-012)', () => {
  let database: { stop: () => Promise<void> };
  let directory: string;
  let app: TestApp;

  beforeAll(async () => {
    database = await startTestDatabase();
  });

  beforeEach(async () => {
    await resetEverything();
    await Promise.all([UploadModel.deleteMany({}), SavedDesignModel.deleteMany({})]);
    directory = mkdtempSync(path.join(tmpdir(), 'prajzo-uploads-'));
    app = newProjectApp({ UPLOAD_DIR: directory });
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  afterAll(async () => {
    await database.stop();
  });

  const upload = (agent: ReturnType<typeof request.agent>, body: Buffer, type = 'image/jpeg') =>
    agent.post('/api/v1/uploads').set('Content-Type', type).send(body);

  it('stores a clean WebP copy under a random name, and serves it', async () => {
    const customer = await signedInCustomer(app);
    const response = await upload(customer, await photo());
    expect(response.status).toBe(201);
    const { src, width, height } = uploadResponseSchema.parse(response.body);
    expect([width, height]).toEqual([800, 600]);
    expect(readdirSync(directory)).toEqual([path.basename(src)]);

    const served = await request(app).get(src);
    expect(served.status).toBe(200);
    expect(served.headers['content-type']).toBe('image/webp');
    expect(served.headers['cache-control']).toContain('immutable');
    expect((await sharp(served.body as Buffer).metadata()).format).toBe('webp');
    expect(await UploadModel.countDocuments()).toBe(1);
  });

  it('is for signed-in customers only, and reads nothing before checking', async () => {
    expect(
      (
        await request(app)
          .post('/api/v1/uploads')
          .set('Content-Type', 'image/jpeg')
          .send(await photo())
      ).status,
    ).toBe(401);
    const admin = await signedInAdmin(app);
    expect((await upload(admin, await photo())).status).toBe(403);
    expect(readdirSync(directory)).toEqual([]);
  });

  it('judges by content: an SVG sent as a JPEG is refused, and nothing is stored', async () => {
    const customer = await signedInCustomer(app);
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>');
    const response = await upload(customer, svg, 'image/jpeg');
    expect(response.status).toBe(400);
    expect(apiErrorBodySchema.parse(response.body).error.message).toBe(
      'Upload a JPEG, PNG or WebP picture.',
    );
    expect(readdirSync(directory)).toEqual([]);
    expect(await UploadModel.countDocuments()).toBe(0);
  });

  it('refuses a file over 5 MB', async () => {
    const customer = await signedInCustomer(app);
    const response = await upload(customer, Buffer.alloc(5 * 1024 * 1024 + 1, 1));
    expect(response.status).toBe(413);
    expect(readdirSync(directory)).toEqual([]);
  });

  it('gives a missing picture a plain 404, never the web app', async () => {
    const response = await request(app).get('/uploads/00000000-0000-0000-0000-000000000000.webp');
    expect(response.status).toBe(404);
    expect(response.headers['content-type']).not.toContain('text/html');
  });

  it('an uploaded picture can be used in a saved design', async () => {
    const customer = await signedInCustomer(app);
    const { src } = uploadResponseSchema.parse((await upload(customer, await photo())).body);
    const config = startingConfig(portfolioTemplate);
    const hero = config.pages[0]!.sections.find((section) => section.type === 'hero')!;
    if (hero.type === 'hero') hero.content.image = { src, alt: 'Me at my desk' };
    const saved = await customer.post('/api/v1/designs').send({ name: 'With my photo', config });
    expect(saved.status).toBe(201);
  });

  it('limits how many pictures one customer can upload per hour', async () => {
    const limited = newProjectApp({ UPLOAD_DIR: directory, UPLOAD_RATE_LIMIT_MAX: '1' });
    const customer = await signedInCustomer(limited);
    expect((await upload(customer, await photo())).status).toBe(201);
    expect((await upload(customer, await photo())).status).toBe(429);
  });
});
