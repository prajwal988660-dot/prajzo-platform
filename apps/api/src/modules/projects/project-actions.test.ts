import {
  adminOverviewSchema,
  adminProjectListSchema,
  apiErrorBodySchema,
  formatRupees,
  projectStatuses,
  type ProjectStatus,
} from '@prajzo/shared';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createCaptureMailer } from '../../services/mailer';
import {
  adminChange,
  adminMoves,
  adminView,
  customerDoes,
  customerView,
  forceStatus,
  goodQuote,
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
import { UserModel } from '../auth/user.model';
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

/** The people and a mail box for a test, with a project that has a quote waiting for an answer. */
async function quoteWaiting() {
  const mailer = createCaptureMailer();
  const app = newProjectApp({}, mailer);
  const admin = await signedInAdmin(app);
  const customer = await signedInCustomer(app);
  const reference = await projectWithQuote(customer, admin);
  mailer.sent.length = 0; // only what happens next matters
  return { app, mailer, admin, customer, reference };
}

/** A project asking the customer a question. */
async function questionAsked() {
  const mailer = createCaptureMailer();
  const app = newProjectApp({}, mailer);
  const admin = await signedInAdmin(app);
  const customer = await signedInCustomer(app);
  const reference = await sendProject(customer);
  await adminMoves(admin, reference, { to: 'under-review' });
  await adminMoves(admin, reference, {
    to: 'awaiting-information',
    note: 'Please send your logo.',
  });
  mailer.sent.length = 0;
  return { app, mailer, admin, customer, reference };
}

/** A project waiting for the customer to review it, with a quote that includes two revisions. */
async function readyForReview() {
  const mailer = createCaptureMailer();
  const app = newProjectApp({}, mailer);
  const admin = await signedInAdmin(app);
  const customer = await signedInCustomer(app);
  const reference = await projectWithQuote(customer, admin);
  expect(
    (await customerDoes(customer, reference, { action: 'accept-quote', quoteVersion: 1 })).status,
  ).toBe(200);
  await adminMoves(admin, reference, { to: 'in-development', confirmedDeliveryDate: inDays(14) });
  await adminMoves(admin, reference, { to: 'testing' });
  await adminMoves(admin, reference, { to: 'awaiting-review' });
  mailer.sent.length = 0;
  return { app, mailer, admin, customer, reference };
}

/** Moves the project back to the customer's review, the way an admin does after changes. */
async function backToReview(admin: Agent, reference: string) {
  await adminMoves(admin, reference, { to: 'in-development' });
  await adminMoves(admin, reference, { to: 'testing' });
  await adminMoves(admin, reference, { to: 'awaiting-review' });
}

describe('accepting a quote', () => {
  it('approves the project, names the quote that was accepted, and sets the revisions it includes', async () => {
    const { customer, admin, reference } = await quoteWaiting();

    const response = await customerDoes(customer, reference, {
      action: 'accept-quote',
      quoteVersion: 1,
    });

    expect(response.status).toBe(200);
    const project = await customerView(customer, reference);
    expect(project.status).toBe('approved');
    expect(project.quote).toMatchObject({ version: 1, amountPaise: 1_500_000, accepted: true });
    expect(project.revisions).toEqual({ included: 2, used: 0 });
    expect(project.timeline.at(-1)).toMatchObject({
      kind: 'status',
      from: 'quote-sent',
      to: 'approved',
      by: 'customer',
      note: null,
    });
    expect(project.allowedActions).toEqual([]);

    const stored = await ProjectRequestModel.findOne({ reference });
    expect(stored?.acceptedQuote).toMatchObject({ version: 1, by: 'customer' });
    const adminSees = await adminView(admin, reference);
    expect(adminSees).toMatchObject({ status: 'approved', waitingOn: 'prajzo' });
    expect(adminSees.allowedChanges.map((change) => change.to)).toEqual([
      'in-development',
      'cancelled',
    ]);
  });

  it('tells Prajzo, with the price, and records it in the activity log', async () => {
    const { customer, mailer, reference } = await quoteWaiting();

    await customerDoes(customer, reference, { action: 'accept-quote', quoteVersion: 1 });

    expect(mailer.sent).toHaveLength(1);
    const email = mailer.sent[0];
    expect(email?.to).toBe('contact@prajzo.com');
    expect(email?.replyTo).toBe('asha@example.com');
    expect(email?.subject).toBe(`${reference}: Asha Rao accepted the quote`);
    expect(email?.text).toContain(`Quote version 1: ${formatRupees(1_500_000)}`);
    expect(email?.text).toContain(`http://localhost:5173/admin/projects/${reference}`);

    const entry = await AuditLogModel.findOne({ action: 'project.quote-accepted' });
    expect(entry).toMatchObject({
      actorName: 'Asha Rao',
      actorRole: 'customer',
      targetId: reference,
      summary: `Accepted the quote for ${reference} (version 1, ${formatRupees(1_500_000)})`,
    });
  });

  it('cannot be done twice, or when no quote is waiting', async () => {
    const { customer, reference } = await quoteWaiting();
    expect(
      (await customerDoes(customer, reference, { action: 'accept-quote', quoteVersion: 1 })).status,
    ).toBe(200);

    const again = await customerDoes(customer, reference, {
      action: 'accept-quote',
      quoteVersion: 1,
    });
    expect(again.status).toBe(409);
    expect(errorOf(again.body).message).toContain("There isn't a quote waiting");

    const fresh = await sendProject(customer);
    expect(
      (await customerDoes(customer, fresh, { action: 'accept-quote', quoteVersion: 1 })).status,
    ).toBe(409);
  });

  it('refuses a quote that is no longer the latest, and accepts the new one', async () => {
    const { customer, admin, reference } = await quoteWaiting();
    await adminMoves(admin, reference, { to: 'under-review' });
    await adminMoves(admin, reference, {
      to: 'quote-sent',
      quote: { ...goodQuote, amountPaise: 1_200_000 },
    });

    const old = await customerDoes(customer, reference, {
      action: 'accept-quote',
      quoteVersion: 1,
    });
    expect(old.status).toBe(409);
    expect(errorOf(old.body).message).toBe(
      'This quote has changed since you opened it. Please read the new quote.',
    );
    expect((await customerView(customer, reference)).status).toBe('quote-sent');

    const current = await customerDoes(customer, reference, {
      action: 'accept-quote',
      quoteVersion: 2,
    });
    expect(current.status).toBe(200);
    expect((await customerView(customer, reference)).quote).toMatchObject({
      version: 2,
      amountPaise: 1_200_000,
    });
  });

  it('refuses nonsense for the quote number', async () => {
    const { customer, reference } = await quoteWaiting();
    for (const quoteVersion of [0, -1, 1.5, '1', null, undefined]) {
      const response = await customerDoes(customer, reference, {
        action: 'accept-quote',
        quoteVersion,
      });
      expect(response.status, String(quoteVersion)).toBe(400);
    }
    expect(
      (await customerDoes(customer, reference, { action: 'accept-quote', quoteVersion: 99 }))
        .status,
    ).toBe(409);
    expect((await customerView(customer, reference)).status).toBe('quote-sent');
  });

  it("is never possible on someone else's project", async () => {
    const { app, reference } = await quoteWaiting();
    const ravi = await signedInCustomer(app, 'ravi@example.com', 'Ravi Kumar');

    const response = await customerDoes(ravi, reference, {
      action: 'accept-quote',
      quoteVersion: 1,
    });

    expect(response.status).toBe(404);
    expect((await ProjectRequestModel.findOne({ reference }))?.status).toBe('quote-sent');
  });

  it('lets exactly one win when the customer accepts as an admin takes the quote back', async () => {
    const { customer, admin, reference } = await quoteWaiting();

    const results = await Promise.all([
      customerDoes(customer, reference, { action: 'accept-quote', quoteVersion: 1 }),
      adminChange(admin, reference, { to: 'under-review' }),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    const stored = await ProjectRequestModel.findOne({ reference });
    // Whoever won, the project is in one consistent state.
    if (stored?.status === 'approved') expect(stored.acceptedQuote?.version).toBe(1);
    else {
      expect(stored?.status).toBe('under-review');
      expect(stored?.acceptedQuote).toBeUndefined();
    }
    expect(stored?.statusHistory.length).toBeGreaterThanOrEqual(3);
  });
});

describe('declining a quote', () => {
  it('cancels the project, with the reason in the timeline, and tells Prajzo', async () => {
    const { customer, mailer, reference } = await quoteWaiting();

    const response = await customerDoes(customer, reference, {
      action: 'decline-quote',
      quoteVersion: 1,
      note: '  Too expensive for now  ',
    });

    expect(response.status).toBe(200);
    const project = await customerView(customer, reference);
    expect(project.status).toBe('cancelled');
    expect(project.timeline.at(-1)).toMatchObject({
      kind: 'status',
      from: 'quote-sent',
      to: 'cancelled',
      by: 'customer',
      note: 'Quote declined: Too expensive for now',
    });
    expect(mailer.sent[0]?.subject).toBe(`${reference}: Asha Rao declined the quote`);
    expect(mailer.sent[0]?.text).toContain('Too expensive for now');
    expect(await AuditLogModel.countDocuments({ action: 'project.quote-declined' })).toBe(1);
  });

  it('works without a reason', async () => {
    const { customer, reference } = await quoteWaiting();
    await customerDoes(customer, reference, { action: 'decline-quote', quoteVersion: 1 });
    expect((await customerView(customer, reference)).timeline.at(-1)).toMatchObject({
      note: 'Quote declined',
    });
  });

  it('refuses an old quote, and a project with no quote waiting', async () => {
    const { customer, reference } = await quoteWaiting();
    expect(
      (await customerDoes(customer, reference, { action: 'decline-quote', quoteVersion: 7 }))
        .status,
    ).toBe(409);
    const fresh = await sendProject(customer);
    expect(
      (await customerDoes(customer, fresh, { action: 'decline-quote', quoteVersion: 1 })).status,
    ).toBe(409);
    expect((await customerView(customer, reference)).status).toBe('quote-sent');
  });
});

describe('answering a question', () => {
  it('adds the answer to the timeline, leaves the status alone, and hands the project back to Prajzo', async () => {
    const { customer, admin, mailer, reference } = await questionAsked();

    const response = await customerDoes(customer, reference, {
      action: 'reply',
      message: '  Here is the logo: https://example.com/logo.png  ',
    });

    expect(response.status).toBe(200);
    const project = await customerView(customer, reference);
    expect(project.status).toBe('awaiting-information');
    expect(project.timeline.at(-1)).toMatchObject({
      kind: 'reply',
      by: 'customer',
      text: 'Here is the logo: https://example.com/logo.png',
    });
    expect(project.allowedActions).toEqual(['cancel', 'reply']);

    expect(await adminView(admin, reference)).toMatchObject({
      customerReplied: true,
      waitingOn: 'prajzo',
    });
    expect(mailer.sent[0]?.subject).toBe(`${reference}: Asha Rao answered your question`);
    expect(mailer.sent[0]?.text).toContain('https://example.com/logo.png');
    expect(await AuditLogModel.countDocuments({ action: 'project.replied' })).toBe(1);
  });

  it('can be repeated, and is cleared when an admin moves the project on', async () => {
    const { customer, admin, reference } = await questionAsked();
    await customerDoes(customer, reference, { action: 'reply', message: 'First part.' });
    await customerDoes(customer, reference, { action: 'reply', message: 'Second part.' });
    expect(
      (await customerView(customer, reference)).timeline.filter((e) => e.kind === 'reply'),
    ).toHaveLength(2);

    const view = await adminMoves(admin, reference, { to: 'under-review' });

    expect(view.customerReplied).toBe(false);
    expect(
      (await customerDoes(customer, reference, { action: 'reply', message: 'More.' })).status,
    ).toBe(409);
  });

  it('is only possible while Prajzo is waiting for an answer', async () => {
    const { customer, reference } = await questionAsked();
    const fresh = await sendProject(customer);

    const response = await customerDoes(customer, fresh, {
      action: 'reply',
      message: 'Hello there.',
    });

    expect(response.status).toBe(409);
    expect(errorOf(response.body).message).toBe(
      "We aren't waiting for an answer on this project right now.",
    );
    expect(reference).not.toBe(fresh);
  });

  it('needs a real answer, and not a huge one', async () => {
    const { customer, reference } = await questionAsked();
    for (const message of ['', ' ', 'x', undefined, 'x'.repeat(2001)]) {
      const response = await customerDoes(customer, reference, { action: 'reply', message });
      expect(response.status, String(message).slice(0, 10)).toBe(400);
    }
    expect((await ProjectRequestModel.findOne({ reference }))?.events).toHaveLength(0);
  });

  it('stops after 20 answers to one question, and starts again when a new question is asked', async () => {
    const { customer, admin, reference } = await questionAsked();
    for (let answer = 1; answer <= 20; answer += 1) {
      const response = await customerDoes(customer, reference, {
        action: 'reply',
        message: `Answer ${answer}`,
      });
      expect(response.status, `answer ${answer}`).toBe(200);
    }
    const tooMany = await customerDoes(customer, reference, {
      action: 'reply',
      message: 'One more',
    });
    expect(tooMany.status).toBe(409);
    expect(errorOf(tooMany.body).message).toContain("You've sent a lot of answers");

    await adminMoves(admin, reference, { to: 'under-review' });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await adminMoves(admin, reference, {
      to: 'awaiting-information',
      note: 'And one more thing, please.',
    });
    expect(
      (await customerDoes(customer, reference, { action: 'reply', message: 'Here you go' })).status,
    ).toBe(200);
  });
});

describe('asking for a revision', () => {
  it('sends the project back for changes, counts it, and tells Prajzo what was asked', async () => {
    const { customer, admin, mailer, reference } = await readyForReview();

    const response = await customerDoes(customer, reference, {
      action: 'request-revision',
      message: '  Please make the logo bigger.  ',
    });

    expect(response.status).toBe(200);
    const project = await customerView(customer, reference);
    expect(project.status).toBe('revision-requested');
    expect(project.revisions).toEqual({ included: 2, used: 1 });
    expect(project.timeline.at(-1)).toMatchObject({
      kind: 'status',
      from: 'awaiting-review',
      to: 'revision-requested',
      by: 'customer',
      note: 'Please make the logo bigger.',
    });
    expect(mailer.sent[0]?.subject).toBe(`${reference}: Asha Rao asked for a revision`);
    expect(mailer.sent[0]?.text).toContain('Please make the logo bigger.');
    expect(await AuditLogModel.countDocuments({ action: 'project.revision-requested' })).toBe(1);

    const adminSees = await adminView(admin, reference);
    expect(adminSees).toMatchObject({
      status: 'revision-requested',
      waitingOn: 'prajzo',
      revisionsOverIncluded: false,
    });
  });

  it('can be asked again, and is flagged for the admin once it goes over what the quote includes', async () => {
    const { customer, admin, reference } = await readyForReview();

    for (const used of [1, 2, 3]) {
      expect(
        (
          await customerDoes(customer, reference, {
            action: 'request-revision',
            message: `Change number ${used}`,
          })
        ).status,
      ).toBe(200);
      const view = await adminView(admin, reference);
      expect(view.revisions).toEqual({ included: 2, used });
      expect(view.revisionsOverIncluded, `after ${used}`).toBe(used > 2);
      await backToReview(admin, reference);
    }
  });

  it('needs to know what to change, and only works when the project is ready for review', async () => {
    const { customer, reference } = await readyForReview();
    for (const message of ['', 'no', undefined, 'x'.repeat(1501)]) {
      const response = await customerDoes(customer, reference, {
        action: 'request-revision',
        message,
      });
      expect(response.status, String(message).slice(0, 10)).toBe(400);
    }
    const fresh = await sendProject(customer);
    const early = await customerDoes(customer, fresh, {
      action: 'request-revision',
      message: 'Change the colours please.',
    });
    expect(early.status).toBe(409);
    expect(errorOf(early.body).message).toBe("This project isn't ready for you to review yet.");
    expect((await customerView(customer, reference)).status).toBe('awaiting-review');
  });
});

describe('saying it looks good', () => {
  it('is recorded and Prajzo is told, but the project is not completed by it', async () => {
    const { customer, mailer, reference } = await readyForReview();

    const response = await customerDoes(customer, reference, { action: 'sign-off' });

    expect(response.status).toBe(200);
    const project = await customerView(customer, reference);
    expect(project.status).toBe('awaiting-review');
    expect(project.timeline.at(-1)).toMatchObject({ kind: 'sign-off', by: 'customer' });
    expect(project.allowedActions).toEqual(['request-revision']);
    expect(mailer.sent[0]?.subject).toBe(`${reference}: Asha Rao says it looks good`);
    expect(await AuditLogModel.countDocuments({ action: 'project.signed-off' })).toBe(1);
  });

  it('hands the project back to Prajzo: waiting on them, listed, counted, and reset by more changes', async () => {
    const { customer, admin, reference } = await readyForReview();
    const overview = async () =>
      adminOverviewSchema.parse((await admin.get('/api/v1/admin/overview')).body);
    const listed = async () =>
      adminProjectListSchema
        .parse((await admin.get('/api/v1/admin/project-requests')).body)
        .items.find((item) => item.reference === reference);

    // Before: the customer has the ball.
    expect(await adminView(admin, reference)).toMatchObject({
      waitingOn: 'customer',
      customerSignedOff: false,
    });
    expect(await listed()).toMatchObject({ waitingOn: 'customer', customerSignedOff: false });
    expect((await overview()).projectRequests.toDo.signedOff).toBe(0);

    await customerDoes(customer, reference, { action: 'sign-off' });

    // After: Prajzo has it, the list and the overview say so.
    expect(await adminView(admin, reference)).toMatchObject({
      waitingOn: 'prajzo',
      customerSignedOff: true,
    });
    expect(await listed()).toMatchObject({ waitingOn: 'prajzo', customerSignedOff: true });
    expect((await overview()).projectRequests.toDo.signedOff).toBe(1);

    // Asking for more changes, and a new review, starts again: it is the customer's turn.
    await customerDoes(customer, reference, {
      action: 'request-revision',
      message: 'One more change please.',
    });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await backToReview(admin, reference);
    expect(await adminView(admin, reference)).toMatchObject({
      waitingOn: 'customer',
      customerSignedOff: false,
    });
    expect((await overview()).projectRequests.toDo.signedOff).toBe(0);

    // And once it is completed, nothing is waiting on anyone.
    await customerDoes(customer, reference, { action: 'sign-off' });
    await adminMoves(admin, reference, { to: 'completed' });
    expect(await adminView(admin, reference)).toMatchObject({
      waitingOn: null,
      customerSignedOff: false,
    });
    expect((await overview()).projectRequests.toDo.signedOff).toBe(0);
  });

  it('cannot be said twice, but can be said again after another round of changes', async () => {
    const { customer, admin, reference } = await readyForReview();
    await customerDoes(customer, reference, { action: 'sign-off' });

    const twice = await customerDoes(customer, reference, { action: 'sign-off' });
    expect(twice.status).toBe(409);
    expect(errorOf(twice.body).message).toBe("You've already told us it looks good.");

    await customerDoes(customer, reference, {
      action: 'request-revision',
      message: 'One more change please.',
    });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await backToReview(admin, reference);
    expect((await customerView(customer, reference)).allowedActions).toContain('sign-off');
    expect((await customerDoes(customer, reference, { action: 'sign-off' })).status).toBe(200);
  });

  it('is only possible when the project is ready for review', async () => {
    const { customer } = await readyForReview();
    const fresh = await sendProject(customer);
    expect((await customerDoes(customer, fresh, { action: 'sign-off' })).status).toBe(409);
  });
});

describe('which buttons each status offers', () => {
  const expected: Record<ProjectStatus, string[]> = {
    received: ['cancel'],
    'under-review': [],
    'awaiting-information': ['cancel', 'reply'],
    'quote-sent': ['cancel', 'accept-quote', 'decline-quote'],
    approved: [],
    'in-development': [],
    testing: [],
    'awaiting-review': ['request-revision', 'sign-off'],
    'revision-requested': [],
    completed: [],
    cancelled: [],
  };

  it('offers exactly these actions, decided by the server', async () => {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);
    const customer = await signedInCustomer(app);
    const reference = await projectWithQuote(customer, admin);
    const quotes = (await ProjectRequestModel.findOne({ reference }))?.quotes;
    const adminUser = await UserModel.findOne({ email: 'admin@example.com' });
    expect(adminUser).not.toBeNull();

    for (const status of projectStatuses) {
      await forceStatus(reference, status, { quotes, events: [] });
      const project = await customerView(customer, reference);
      expect(project.allowedActions, status).toEqual(expected[status]);
    }
  });

  it('refuses every action the project does not offer', async () => {
    const app = newProjectApp({ PROJECT_ACTION_RATE_LIMIT_MAX: '1000' });
    const admin = await signedInAdmin(app);
    const customer = await signedInCustomer(app);
    const reference = await projectWithQuote(customer, admin);
    const quotes = (await ProjectRequestModel.findOne({ reference }))?.quotes;
    const actions: Record<string, Record<string, unknown>> = {
      cancel: { action: 'cancel' },
      'accept-quote': { action: 'accept-quote', quoteVersion: 1 },
      'decline-quote': { action: 'decline-quote', quoteVersion: 1 },
      reply: { action: 'reply', message: 'An answer, in full.' },
      'request-revision': { action: 'request-revision', message: 'Please change the colours.' },
      'sign-off': { action: 'sign-off' },
    };

    for (const status of projectStatuses) {
      for (const [name, body] of Object.entries(actions)) {
        await forceStatus(reference, status, { quotes, events: [], customerReplyPending: false });
        const response = await customerDoes(customer, reference, body);
        if (expected[status].includes(name)) {
          expect(response.status, `${name} in ${status}`).toBe(200);
        } else {
          expect(response.status, `${name} in ${status}`).toBe(409);
        }
      }
    }
  });
});

describe('actions in general', () => {
  it('need a signed-in customer', async () => {
    const { app, reference } = await quoteWaiting();
    const visitor = await request
      .agent(app)
      .post(`/api/v1/project-requests/${reference}/actions`)
      .send({ action: 'cancel' });
    expect(visitor.status).toBe(401);

    const admin = await signedInAdmin(app);
    const asAdmin = await customerDoes(admin, reference, { action: 'cancel' });
    expect(asAdmin.status).toBe(403);
    expect((await ProjectRequestModel.findOne({ reference }))?.status).toBe('quote-sent');
  });

  it('refuse an action that does not exist, or one with the wrong details', async () => {
    const { customer, reference } = await quoteWaiting();
    for (const body of [
      { action: 'approve' },
      { action: 'complete' },
      { action: 'refund' },
      { action: '' },
      {},
      { action: 'accept-quote' },
      { action: 'reply' },
    ]) {
      const response = await customerDoes(customer, reference, body);
      expect(response.status, JSON.stringify(body)).toBe(400);
    }
    expect((await customerView(customer, reference)).status).toBe('quote-sent');
  });

  it('are limited to 60 an hour for each customer', async () => {
    const app = newProjectApp();
    const customer = await signedInCustomer(app);
    const other = await signedInCustomer(app, 'ravi@example.com', 'Ravi Kumar');
    const reference = await sendProject(customer);
    const otherReference = await sendProject(other);

    for (let attempt = 1; attempt <= 60; attempt += 1) {
      const response = await customerDoes(customer, reference, { action: 'sign-off' });
      expect(response.status, `attempt ${attempt}`).toBe(409); // not ready for review: refused, but counted
    }
    const blocked = await customerDoes(customer, reference, { action: 'sign-off' });
    expect(blocked.status).toBe(429);
    expect(errorOf(blocked.body).code).toBe('RATE_LIMITED');
    // Someone else is not held up.
    expect((await customerDoes(other, otherReference, { action: 'cancel' })).status).toBe(200);
  });
});
