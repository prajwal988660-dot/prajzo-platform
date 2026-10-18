import { apiErrorBodySchema, contactResponseSchema } from '@prajzo/shared';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createCaptureMailer, type Mailer } from '../../services/mailer';
import { startTestDatabase, testApp, testEnv } from '../../test/helpers';
import { ensureCatalogueDefaults } from '../catalogue/catalogue.service';
import { ContactMessageModel } from './contact-message.model';

const validRequest = {
  name: 'Asha Rao',
  email: 'Asha@Example.com',
  phone: '+91 98765 43210',
  websiteType: 'business-websites',
  packageKey: 'professional-website',
  message: 'We need a five-page website for our bakery with a WhatsApp order button.',
  consent: true,
};

describe('POST /api/v1/contact', () => {
  let database: { stop: () => Promise<void> };

  beforeAll(async () => {
    database = await startTestDatabase();
    await ensureCatalogueDefaults();
  });

  afterEach(async () => {
    await ContactMessageModel.deleteMany({});
  });

  afterAll(async () => {
    await database.stop();
  });

  it('saves the message, notifies Prajzo and confirms to the sender', async () => {
    const mailer = createCaptureMailer();
    const response = await request(testApp({ mailer })).post('/api/v1/contact').send(validRequest);

    expect(response.status).toBe(201);
    expect(contactResponseSchema.parse(response.body).message).toContain('Asha Rao');

    const saved = await ContactMessageModel.find().lean();
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      name: 'Asha Rao',
      email: 'asha@example.com',
      websiteType: 'business-websites',
      packageKey: 'professional-website',
      status: 'new',
    });
    expect(saved[0]?.consentAt).toBeInstanceOf(Date);

    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]).toMatchObject({
      to: 'contact@prajzo.com',
      replyTo: 'asha@example.com',
      subject: 'New enquiry from Asha Rao',
    });
    expect(mailer.sent[0]?.text).toContain('bakery');
  });

  it('accepts the minimum: name, email, message and consent', async () => {
    const response = await request(testApp()).post('/api/v1/contact').send({
      name: 'Ravi',
      email: 'ravi@example.com',
      message: 'Please call me about a portfolio site.',
      consent: true,
    });

    expect(response.status).toBe(201);
    expect(await ContactMessageModel.countDocuments()).toBe(1);
  });

  it('rejects missing or invalid details with a message per field, and saves nothing', async () => {
    const response = await request(testApp())
      .post('/api/v1/contact')
      .send({ name: '', email: 'not-an-email', message: 'short', consent: false });

    expect(response.status).toBe(400);
    const { error } = apiErrorBodySchema.parse(response.body);
    expect(error.code).toBe('VALIDATION_FAILED');
    expect(Object.keys(error.fields ?? {}).sort()).toEqual(['consent', 'email', 'message', 'name']);
    expect(await ContactMessageModel.countDocuments()).toBe(0);
  });

  it('rejects a website type or package that is not in the catalogue', async () => {
    const response = await request(testApp())
      .post('/api/v1/contact')
      .send({ ...validRequest, websiteType: 'spaceship', packageKey: 'gold' });

    expect(response.status).toBe(400);
    expect(apiErrorBodySchema.parse(response.body).error.fields).toEqual({
      websiteType: 'Choose a website type from the list',
      packageKey: 'Choose a package from the list',
    });
  });

  it('accepts "other" and "not sure" as answers', async () => {
    const response = await request(testApp())
      .post('/api/v1/contact')
      .send({ ...validRequest, websiteType: 'other', packageKey: 'not-sure' });
    expect(response.status).toBe(201);
  });

  it('rejects requests that filled in the hidden spam trap', async () => {
    const response = await request(testApp())
      .post('/api/v1/contact')
      .send({ ...validRequest, company: 'Totally Real Business' });

    expect(response.status).toBe(400);
    expect(await ContactMessageModel.countDocuments()).toBe(0);
  });

  it('still succeeds when the notification email fails, because the message is saved', async () => {
    const failingMailer: Mailer = { send: () => Promise.reject(new Error('SMTP down')) };
    const response = await request(testApp({ mailer: failingMailer }))
      .post('/api/v1/contact')
      .send(validRequest);

    expect(response.status).toBe(201);
    expect(await ContactMessageModel.countDocuments()).toBe(1);
  });

  it('limits how many messages one connection can send', async () => {
    const app = testApp({ env: testEnv({ CONTACT_RATE_LIMIT_MAX: '2' }) });

    expect((await request(app).post('/api/v1/contact').send(validRequest)).status).toBe(201);
    expect((await request(app).post('/api/v1/contact').send(validRequest)).status).toBe(201);
    const third = await request(app).post('/api/v1/contact').send(validRequest);

    expect(third.status).toBe(429);
    expect(apiErrorBodySchema.parse(third.body).error.code).toBe('RATE_LIMITED');
    expect(await ContactMessageModel.countDocuments()).toBe(2);
  });
});
