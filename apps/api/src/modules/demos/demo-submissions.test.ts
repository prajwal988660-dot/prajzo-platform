import { apiErrorBodySchema, demoSubmissionResponseSchema } from '@prajzo/shared';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createCaptureMailer } from '../../services/mailer';
import { startTestDatabase, testApp, testEnv } from '../../test/helpers';
import { DemoSubmissionModel } from './demo-submission.model';

const validMessage = {
  template: 'portfolio',
  name: 'Kiran Test',
  email: 'Kiran@Example.com',
  message: 'I like this design. Could my portfolio look like this?',
};

const DAY = 24 * 60 * 60 * 1000;

describe('POST /api/v1/demo-submissions (D-014)', () => {
  let database: { stop: () => Promise<void> };

  beforeAll(async () => {
    database = await startTestDatabase();
  });

  afterEach(async () => {
    await DemoSubmissionModel.deleteMany({});
  });

  afterAll(async () => {
    await database.stop();
  });

  it('saves the message for 7 days, confirms, and emails nobody', async () => {
    const mailer = createCaptureMailer();
    const before = Date.now();
    const response = await request(testApp({ mailer }))
      .post('/api/v1/demo-submissions')
      .send(validMessage);

    expect(response.status).toBe(201);
    const { deleteAfter } = demoSubmissionResponseSchema.parse(response.body);
    const saved = await DemoSubmissionModel.find().lean();
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      template: 'portfolio',
      name: 'Kiran Test',
      email: 'kiran@example.com',
      status: 'new',
    });
    const keptFor = saved[0]!.expiresAt.getTime() - before;
    expect(keptFor).toBeGreaterThanOrEqual(7 * DAY - 1000);
    expect(keptFor).toBeLessThanOrEqual(7 * DAY + 5000);
    expect(new Date(deleteAfter).getTime()).toBe(saved[0]!.expiresAt.getTime());
    expect(mailer.sent).toHaveLength(0);
  });

  it('is deleted by the database itself: the expiry index exists', async () => {
    await DemoSubmissionModel.init();
    const indexes = await DemoSubmissionModel.collection.indexes();
    expect(indexes).toContainEqual(
      expect.objectContaining({ key: { expiresAt: 1 }, expireAfterSeconds: 0 }),
    );
  });

  it('keeps it for the number of days in the settings', async () => {
    const app = testApp({ env: testEnv({ DEMO_SUBMISSION_TTL_DAYS: '2' }) });
    const before = Date.now();
    await request(app).post('/api/v1/demo-submissions').send(validMessage).expect(201);
    const saved = await DemoSubmissionModel.findOne().lean();
    expect(saved!.expiresAt.getTime() - before).toBeLessThan(2 * DAY + 5000);
  });

  it('refuses a message that breaks the rules, saying which field', async () => {
    const response = await request(testApp())
      .post('/api/v1/demo-submissions')
      .send({ ...validMessage, email: 'not-an-email', template: 'not-a-template' });
    expect(response.status).toBe(400);
    const { error } = apiErrorBodySchema.parse(response.body);
    expect(error.code).toBe('VALIDATION_FAILED');
    expect(Object.keys(error.fields ?? {}).sort()).toEqual(['email', 'template']);
    expect(await DemoSubmissionModel.countDocuments()).toBe(0);
  });

  it('refuses a filled-in spam trap', async () => {
    const response = await request(testApp())
      .post('/api/v1/demo-submissions')
      .send({ ...validMessage, company: 'Spam Inc' });
    expect(response.status).toBe(400);
    expect(await DemoSubmissionModel.countDocuments()).toBe(0);
  });

  it('refuses messages sent from another website', async () => {
    const response = await request(testApp())
      .post('/api/v1/demo-submissions')
      .set('Origin', 'https://evil.example')
      .send(validMessage);
    expect(response.status).toBe(403);
  });

  it('limits how many one connection can send', async () => {
    const app = testApp({ env: testEnv({ DEMO_SUBMISSION_RATE_LIMIT_MAX: '2' }) });
    const send = () => request(app).post('/api/v1/demo-submissions').send(validMessage);
    expect((await send()).status).toBe(201);
    expect((await send()).status).toBe(201);
    const refused = await send();
    expect(refused.status).toBe(429);
    expect(await DemoSubmissionModel.countDocuments()).toBe(2);
  });

  describe('registrations (Event demo, Phase 11)', () => {
    const registration = {
      form: 'registration',
      template: 'event',
      name: 'Asha Test',
      email: 'Asha@Example.com',
      phone: '+91 98765 43210',
      organisation: 'A college',
      choice: 'Hackathon',
    };

    it('saves a registration with the event chosen', async () => {
      const response = await request(testApp()).post('/api/v1/demo-submissions').send(registration);
      expect(response.status).toBe(201);
      const saved = await DemoSubmissionModel.findOne().lean();
      expect(saved).toMatchObject({
        form: 'registration',
        template: 'event',
        email: 'asha@example.com',
        phone: '+91 98765 43210',
        organisation: 'A college',
        choice: 'Hackathon',
      });
      expect(saved?.message).toBeUndefined();
    });

    it('only accepts one of the events the form offers', async () => {
      const response = await request(testApp())
        .post('/api/v1/demo-submissions')
        .send({ ...registration, choice: 'Free lunch' });
      expect(response.status).toBe(400);
      expect(apiErrorBodySchema.parse(response.body).error.fields).toEqual({
        choice: 'Choose one of the events on the form',
      });
    });

    it('refuses a registration for a demo that has no registration form', async () => {
      const response = await request(testApp())
        .post('/api/v1/demo-submissions')
        .send({ ...registration, template: 'portfolio' });
      expect(response.status).toBe(400);
      expect(await DemoSubmissionModel.countDocuments()).toBe(0);
    });

    it('checks the fields like the browser does, with the optional ones left out', async () => {
      const bare = await request(testApp())
        .post('/api/v1/demo-submissions')
        .send({ ...registration, phone: '', organisation: '' });
      expect(bare.status).toBe(201);
      const wrong = await request(testApp())
        .post('/api/v1/demo-submissions')
        .send({ ...registration, phone: 'call me', email: 'nope' });
      expect(Object.keys(apiErrorBodySchema.parse(wrong.body).error.fields ?? {}).sort()).toEqual([
        'email',
        'phone',
      ]);
    });
  });
});
