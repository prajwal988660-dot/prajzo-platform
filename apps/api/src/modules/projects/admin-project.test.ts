import { adminProjectListSchema, apiErrorBodySchema, formatCalendarDate } from '@prajzo/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createCaptureMailer, type Mailer } from '../../services/mailer';
import {
  adminMoves,
  adminView,
  customerView,
  forceStatus,
  inDays,
  newProjectApp,
  projectWithQuote,
  resetEverything,
  sendProject,
  signedInAdmin,
  signedInCustomer,
  type Agent,
} from '../../test/project-helpers';
import { startTestDatabase } from '../../test/helpers';
import { AuditLogModel } from '../audit/audit-log.model';
import { ensureCatalogueDefaults } from '../catalogue/catalogue.service';
import { ProjectRequestModel } from './project-request.model';

let database: { stop: () => Promise<void> };

beforeAll(async () => {
  database = await startTestDatabase();
  await ensureCatalogueDefaults();
});

afterAll(async () => {
  await database.stop();
});

beforeEach(resetEverything);

const errorOf = (body: unknown) => apiErrorBodySchema.parse(body).error;
const list = async (admin: Agent, query = '') =>
  adminProjectListSchema.parse((await admin.get(`/api/v1/admin/project-requests${query}`)).body);

describe('the project list', () => {
  it('shows the open projects newest activity first, with who sent them and who acts next', async () => {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);
    const asha = await signedInCustomer(app, 'asha@example.com', 'Asha Rao');
    const ravi = await signedInCustomer(app, 'ravi@example.com', 'Ravi Kumar');
    const studio = await sendProject(asha, { title: 'Studio website' });
    const shop = await sendProject(ravi, { title: 'Shop website' });
    await adminMoves(admin, studio, { to: 'under-review' }); // the most recent activity

    const result = await list(admin);

    expect(result.items.map((item) => item.reference)).toEqual([studio, shop]);
    expect(result.items[0]).toMatchObject({
      title: 'Studio website',
      status: 'under-review',
      customerName: 'Asha Rao',
      customerEmail: 'asha@example.com',
      categoryTitle: 'Business Websites',
      waitingOn: 'prajzo',
      customerReplied: false,
      customerSignedOff: false,
    });
    expect(result).toMatchObject({ page: 1, limit: 20, total: 2 });
  });

  it('says who has to act next, for every status', async () => {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);
    const customer = await signedInCustomer(app);
    const expected: Record<string, string | null> = {
      received: 'prajzo',
      'under-review': 'prajzo',
      'awaiting-information': 'customer',
      'quote-sent': 'customer',
      approved: 'prajzo',
      'in-development': 'prajzo',
      testing: 'prajzo',
      'awaiting-review': 'customer',
      'revision-requested': 'prajzo',
      completed: null,
      cancelled: null,
    };
    for (const [status, waitingOn] of Object.entries(expected)) {
      const reference = await sendProject(customer);
      await forceStatus(reference, status);
      const item = (await list(admin, '?status=all&limit=50')).items.find(
        (i) => i.reference === reference,
      );
      expect(item?.waitingOn, status).toBe(waitingOn);
    }
  });

  it('can show one status, every project, or only the ones still open', async () => {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);
    const customer = await signedInCustomer(app);
    const received = await sendProject(customer, { title: 'Just arrived' });
    const reviewing = await sendProject(customer, { title: 'Being reviewed' });
    const done = await sendProject(customer, { title: 'All done' });
    const cancelled = await sendProject(customer, { title: 'Called off' });
    await forceStatus(reviewing, 'under-review');
    await forceStatus(done, 'completed');
    await forceStatus(cancelled, 'cancelled');

    const refs = async (query: string) =>
      (await list(admin, query)).items.map((item) => item.reference).sort();

    expect(await refs('')).toEqual([received, reviewing].sort());
    expect(await refs('?status=open')).toEqual([received, reviewing].sort());
    expect(await refs('?status=all')).toEqual([received, reviewing, done, cancelled].sort());
    expect(await refs('?status=completed')).toEqual([done]);
    expect(await refs('?status=cancelled')).toEqual([cancelled]);
    expect(await refs('?status=received')).toEqual([received]);
    expect(await refs('?status=quote-sent')).toEqual([]);
  });

  it('finds projects by reference, name, customer name or email, ignoring case', async () => {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);
    const asha = await signedInCustomer(app, 'asha@example.com', 'Asha Rao');
    const ravi = await signedInCustomer(app, 'ravi.k@shopmail.test', 'Ravi Kumar');
    const studio = await sendProject(asha, { title: 'Photography studio' });
    const shop = await sendProject(ravi, { title: 'Handmade soap shop' });
    const found = async (q: string) =>
      (await list(admin, `?q=${encodeURIComponent(q)}`)).items.map((i) => i.reference);

    expect(await found(studio.slice(-4))).toEqual([studio]); // part of the reference number
    expect(await found(shop)).toEqual([shop]);
    expect(await found('SOAP')).toEqual([shop]);
    expect(await found('photo')).toEqual([studio]);
    expect(await found('ravi')).toEqual([shop]);
    expect(await found('Asha R')).toEqual([studio]);
    expect(await found('shopmail')).toEqual([shop]);
    expect(await found('nothing like this')).toEqual([]);
  });

  it('searches for what you typed, not for a pattern', async () => {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);
    const customer = await signedInCustomer(app);
    const dotted = await sendProject(customer, { title: 'Site v2.0 (beta)' });
    await sendProject(customer, { title: 'Site v2x0 plain' });
    const found = async (q: string) =>
      (await list(admin, `?q=${encodeURIComponent(q)}`)).items.map((i) => i.reference);

    // As a pattern, "v2.0" would also match "v2x0": here a dot is only a dot.
    expect(await found('v2.0')).toEqual([dotted]);
    expect(await found('(beta)')).toEqual([dotted]);
    expect(await found('.*')).toEqual([]);
    expect(await found('[')).toEqual([]);
    expect(await found('^Site')).toEqual([]);
    expect(await found('plain|beta')).toEqual([]);
  });

  it('works together with the status filter, and a page at a time', async () => {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);
    const customer = await signedInCustomer(app);
    const refs: string[] = [];
    for (let index = 1; index <= 5; index += 1)
      refs.push(await sendProject(customer, { title: `Website ${index}` }));
    await forceStatus(refs[0]!, 'under-review');

    const open = await list(admin, '?limit=2&page=1');
    const second = await list(admin, '?limit=2&page=2');
    const third = await list(admin, '?limit=2&page=3');
    const searched = await list(admin, '?status=under-review&q=website');

    expect([open.items.length, second.items.length, third.items.length]).toEqual([2, 2, 1]);
    expect(open.total).toBe(5);
    expect(
      new Set([...open.items, ...second.items, ...third.items].map((i) => i.reference)).size,
    ).toBe(5);
    expect(searched.items.map((i) => i.reference)).toEqual([refs[0]]);
  });

  it('refuses a status, page or page size that makes no sense', async () => {
    const admin = await signedInAdmin(newProjectApp());
    for (const query of [
      '?status=finished',
      '?status=OPEN',
      '?page=0',
      '?page=abc',
      '?limit=0',
      '?limit=51',
      `?q=${'x'.repeat(101)}`,
    ]) {
      expect((await admin.get(`/api/v1/admin/project-requests${query}`)).status, query).toBe(400);
    }
  });

  it('sends no internal details', async () => {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);
    await sendProject(await signedInCustomer(app));

    const response = await admin.get('/api/v1/admin/project-requests');

    expect(response.headers['cache-control']).toBe('no-store');
    expect(JSON.stringify(response.body)).not.toMatch(
      /customerId|userId|_id|__v|adminNotes|passwordHash/,
    );
  });
});

describe('opening a project', () => {
  it('shows an admin everything: the customer, the request, the quote, the notes and every change with who made it', async () => {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);
    const customer = await signedInCustomer(app, 'asha@example.com', 'Asha Rao');
    const reference = await projectWithQuote(customer, admin, {
      notes: 'Please call after 5 pm.',
      contactPreference: 'phone',
      phone: '+91 98866 07720',
      preferredDate: inDays(30),
    });
    await admin
      .post(`/api/v1/admin/project-requests/${reference}/notes`)
      .send({ text: 'Called, no answer.' });

    const view = await adminView(admin, reference);

    expect(view).toMatchObject({
      reference,
      title: 'Website for my studio',
      status: 'quote-sent',
      source: 'start-form',
      categoryTitle: 'Business Websites',
      packageName: 'Professional Website',
      customer: { name: 'Asha Rao', email: 'asha@example.com', phone: '+91 98866 07720' },
      contactPreference: 'phone',
      notes: 'Please call after 5 pm.',
      preferredDate: inDays(30),
      waitingOn: 'customer',
      customerReplied: false,
      customerSignedOff: false,
      revisions: null,
    });
    expect(view.quotes).toHaveLength(1);
    expect(view.adminNotes).toEqual([
      expect.objectContaining({ text: 'Called, no answer.', byName: 'Prajzo Admin' }),
    ]);
    expect(
      view.timeline.map((entry) => [
        entry.kind === 'status' ? entry.to : entry.kind,
        entry.actorName,
      ]),
    ).toEqual([
      ['received', 'Asha Rao'],
      ['under-review', 'Prajzo Admin'],
      ['quote-sent', 'Prajzo Admin'],
    ]);
    // What the admin may do next, with what each move needs.
    expect(view.allowedChanges).toEqual([
      { to: 'under-review', needs: null },
      { to: 'approved', needs: 'note' },
      { to: 'cancelled', needs: null },
    ]);
  });

  it('keeps the internal ids out of what it sends', async () => {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);
    const reference = await sendProject(await signedInCustomer(app));

    const response = await admin.get(`/api/v1/admin/project-requests/${reference}`);

    expect(JSON.stringify(response.body)).not.toMatch(/userId|_id|__v|passwordHash|statusHistory/);
  });

  it('says "not found" for a reference that does not exist or is not a reference', async () => {
    const admin = await signedInAdmin(newProjectApp());
    for (const reference of ['PRZ-2026-9999', 'PRZ-1', 'abc', 'PRZ-2026-0001;x']) {
      const response = await admin.get(`/api/v1/admin/project-requests/${reference}`);
      expect(response.status, reference).toBe(404);
    }
  });
});

describe('the delivery date', () => {
  it('is confirmed at any stage before the end, shown to the customer, and emailed to them', async () => {
    const mailer = createCaptureMailer();
    const app = newProjectApp({}, mailer);
    const admin = await signedInAdmin(app);
    const customer = await signedInCustomer(app);
    const reference = await sendProject(customer);
    mailer.sent.length = 0;
    const date = inDays(21);

    const response = await admin
      .post(`/api/v1/admin/project-requests/${reference}/delivery-date`)
      .send({ date, note: 'Allowing for the festival week.' });

    expect(response.status).toBe(200);
    const view = await adminView(admin, reference);
    expect(view.confirmedDeliveryDate).toBe(date);
    expect(view.timeline.at(-1)).toMatchObject({
      kind: 'delivery-date',
      by: 'admin',
      from: null,
      to: date,
      note: 'Allowing for the festival week.',
      actorName: 'Prajzo Admin',
    });
    const customerSees = await customerView(customer, reference);
    expect(customerSees.confirmedDeliveryDate).toBe(date);
    expect(customerSees.timeline.at(-1)).toMatchObject({ kind: 'delivery-date', to: date });

    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]?.to).toBe('asha@example.com');
    expect(mailer.sent[0]?.subject).toBe(
      `Delivery date for your project ${reference}: ${formatCalendarDate(date)}`,
    );
    expect(mailer.sent[0]?.text).toContain("We've confirmed the delivery date");
    expect(mailer.sent[0]?.text).toContain('Allowing for the festival week.');
    expect(await AuditLogModel.findOne({ action: 'project.delivery-date' })).toMatchObject({
      summary: `Confirmed the delivery date of ${reference}: ${formatCalendarDate(date)}`,
    });
  });

  it('can be changed, and the change shows the old date and the new one', async () => {
    const mailer = createCaptureMailer();
    const app = newProjectApp({}, mailer);
    const admin = await signedInAdmin(app);
    const reference = await sendProject(await signedInCustomer(app));
    const first = inDays(14);
    const later = inDays(20);
    await admin
      .post(`/api/v1/admin/project-requests/${reference}/delivery-date`)
      .send({ date: first });
    mailer.sent.length = 0;

    const response = await admin
      .post(`/api/v1/admin/project-requests/${reference}/delivery-date`)
      .send({ date: later });

    expect(response.status).toBe(200);
    const view = await adminView(admin, reference);
    expect(view.confirmedDeliveryDate).toBe(later);
    expect(view.timeline.at(-1)).toMatchObject({ kind: 'delivery-date', from: first, to: later });
    expect(mailer.sent[0]?.text).toContain(
      `from ${formatCalendarDate(first)} to ${formatCalendarDate(later)}`,
    );
  });

  it('is refused when it is the same date, a date that has passed, or not a date at all', async () => {
    const admin = await signedInAdmin(newProjectApp());
    const app = newProjectApp();
    const reference = await sendProject(await signedInCustomer(app));
    const date = inDays(10);
    const post = (body: Record<string, unknown>) =>
      admin.post(`/api/v1/admin/project-requests/${reference}/delivery-date`).send(body);
    expect((await post({ date })).status).toBe(200);

    const same = await post({ date });
    expect(same.status).toBe(400);
    expect(errorOf(same.body).fields).toEqual({ date: 'That is already the delivery date' });
    expect(errorOf((await post({ date: '2020-01-01' })).body).fields?.date).toBe(
      "Choose a date that hasn't passed",
    );
    expect(errorOf((await post({ date: 'next week' })).body).fields?.date).toBe(
      'Choose a date from the calendar',
    );
    expect((await post({})).status).toBe(400);
    expect((await adminView(admin, reference)).confirmedDeliveryDate).toBe(date);
  });

  it('cannot be changed once the project is completed or cancelled', async () => {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);
    const customer = await signedInCustomer(app);
    for (const status of ['completed', 'cancelled']) {
      const reference = await sendProject(customer);
      await forceStatus(reference, status);
      const response = await admin
        .post(`/api/v1/admin/project-requests/${reference}/delivery-date`)
        .send({ date: inDays(10) });
      expect(response.status, status).toBe(409);
      expect(errorOf(response.body).message).toContain('finished');
    }
  });

  it('is refused for a project that does not exist', async () => {
    const admin = await signedInAdmin(newProjectApp());
    const response = await admin
      .post('/api/v1/admin/project-requests/PRZ-2026-9999/delivery-date')
      .send({ date: inDays(10) });
    expect(response.status).toBe(404);
  });

  it('still saves the date when the email cannot be sent', async () => {
    const failing: Mailer = { send: () => Promise.reject(new Error('The mail server is down')) };
    const app = newProjectApp({}, failing);
    const admin = await signedInAdmin(app);
    const reference = await sendProject(await signedInCustomer(app));

    const response = await admin
      .post(`/api/v1/admin/project-requests/${reference}/delivery-date`)
      .send({ date: inDays(10) });

    expect(response.status).toBe(200);
    expect((await ProjectRequestModel.findOne({ reference }))?.confirmedDeliveryDate).toBe(
      inDays(10),
    );
  });
});

describe('internal notes', () => {
  it('are added by an admin, shown to admins in order, and never shown to the customer', async () => {
    const mailer = createCaptureMailer();
    const app = newProjectApp({}, mailer);
    const admin = await signedInAdmin(app);
    const customer = await signedInCustomer(app);
    const reference = await sendProject(customer);
    mailer.sent.length = 0;

    const first = await admin
      .post(`/api/v1/admin/project-requests/${reference}/notes`)
      .send({ text: '  Customer sounds unsure about the budget.  ' });
    await admin
      .post(`/api/v1/admin/project-requests/${reference}/notes`)
      .send({ text: 'Will call tomorrow.' });

    expect(first.status).toBe(201);
    const view = await adminView(admin, reference);
    expect(view.adminNotes.map((note) => note.text)).toEqual([
      'Customer sounds unsure about the budget.',
      'Will call tomorrow.',
    ]);
    expect(view.adminNotes[0]).toMatchObject({ byName: 'Prajzo Admin' });
    expect(view.adminNotes[0]?.id).toMatch(/^[0-9a-f]{24}$/);

    // The customer sees nothing of it: not in the project, not in the timeline, not by email.
    const customerResponse = await customer.get(`/api/v1/project-requests/${reference}`);
    expect(JSON.stringify(customerResponse.body)).not.toMatch(
      /unsure about the budget|Will call tomorrow|adminNotes/,
    );
    expect(mailer.sent).toHaveLength(0);
    expect(
      await AuditLogModel.countDocuments({ action: 'project.note', targetId: reference }),
    ).toBe(2);
  });

  it('can be added at any stage, even after the project is finished', async () => {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);
    const reference = await sendProject(await signedInCustomer(app));
    await forceStatus(reference, 'completed');

    const response = await admin
      .post(`/api/v1/admin/project-requests/${reference}/notes`)
      .send({ text: 'Invoice paid on 30 Oct.' });

    expect(response.status).toBe(201);
  });

  it('need some text, and not a huge amount', async () => {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);
    const reference = await sendProject(await signedInCustomer(app));
    for (const text of ['', ' ', 'x', undefined, 'x'.repeat(2001)]) {
      const response = await admin
        .post(`/api/v1/admin/project-requests/${reference}/notes`)
        .send({ text });
      expect(response.status, String(text).slice(0, 5)).toBe(400);
    }
    expect((await adminView(admin, reference)).adminNotes).toEqual([]);
    expect(
      (
        await admin
          .post('/api/v1/admin/project-requests/PRZ-2026-9999/notes')
          .send({ text: 'Hello there' })
      ).status,
    ).toBe(404);
  });
});
