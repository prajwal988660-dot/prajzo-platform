import {
  apiErrorBodySchema,
  canChangeStatus,
  formatRupees,
  projectStatuses,
  statusTransitions,
  type ProjectStatus,
} from '@prajzo/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createCaptureMailer, type Mailer } from '../../services/mailer';
import {
  adminAccount,
  adminChange,
  adminMoves,
  adminView,
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

describe('every possible status change, tried one by one', () => {
  /** What an admin has to send to make this move (a quote, a date or a note, when it needs one). */
  function validBody(from: ProjectStatus, to: ProjectStatus): Record<string, unknown> {
    const body: Record<string, unknown> = { to };
    const change = canChangeStatus(from, to, 'admin');
    if (!change.allowed) return body;
    if (change.needs === 'quote') body.quote = goodQuote;
    if (change.needs === 'deliveryDate') body.confirmedDeliveryDate = inDays(10);
    if (change.needs === 'note') body.note = 'A reason the customer will read.';
    return body;
  }

  it('allows exactly the moves in the table, and refuses all the others without changing anything', async () => {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);
    const customer = await signedInCustomer(app);
    const reference = await sendProject(customer);
    const adminUser = await UserModel.findOne({ email: adminAccount.email });
    const sentQuote = {
      version: 1,
      ...goodQuote,
      sentAt: new Date(),
      sentBy: adminUser?._id,
      sentByName: adminAccount.name,
    };

    let tried = 0;
    let allowedCount = 0;
    for (const from of projectStatuses) {
      for (const to of projectStatuses) {
        // Put the project back exactly as it would be in the status "from".
        await ProjectRequestModel.updateOne(
          { reference },
          {
            $set: {
              status: from,
              customerReplyPending: false,
              quotes: [sentQuote],
              events: [],
              statusHistory: [
                {
                  from: null,
                  to: 'received',
                  by: 'customer',
                  userId: adminUser?._id,
                  at: new Date(),
                },
              ],
            },
            $unset: { acceptedQuote: '', confirmedDeliveryDate: '', revisions: '' },
          },
        );

        const response = await adminChange(admin, reference, validBody(from, to));
        const stored = await ProjectRequestModel.findOne({ reference });
        const label = `${from} → ${to}`;
        tried += 1;

        if (canChangeStatus(from, to, 'admin').allowed) {
          allowedCount += 1;
          expect(response.status, `${label}: ${JSON.stringify(response.body)}`).toBe(200);
          expect(stored?.status, label).toBe(to);
          expect(stored?.statusHistory, label).toHaveLength(2);
          expect(stored?.statusHistory[1], label).toMatchObject({
            from,
            to,
            by: 'admin',
            byName: adminAccount.name,
          });
        } else {
          expect(response.status, label).toBe(409);
          expect(errorOf(response.body).code, label).toBe('CONFLICT');
          expect(stored?.status, label).toBe(from);
          expect(stored?.statusHistory, label).toHaveLength(1);
        }
      }
    }
    expect(tried).toBe(121);
    expect(allowedCount).toBe(statusTransitions.filter((t) => t.by.includes('admin')).length);
  });

  it('names the two statuses when it refuses a move', async () => {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);
    const reference = await sendProject(await signedInCustomer(app));

    const response = await adminChange(admin, reference, { to: 'completed' });

    expect(response.status).toBe(409);
    expect(errorOf(response.body).message).toContain('"Request Received" to "Completed"');
  });

  it('refuses a status that does not exist, and a project that does not exist', async () => {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);
    const reference = await sendProject(await signedInCustomer(app));

    expect((await adminChange(admin, reference, { to: 'finished' })).status).toBe(400);
    expect((await adminChange(admin, reference, {})).status).toBe(400);
    expect((await adminChange(admin, 'PRZ-2026-9999', { to: 'under-review' })).status).toBe(404);
    expect((await adminChange(admin, 'not-a-reference', { to: 'under-review' })).status).toBe(404);
  });
});

describe('what a move has to come with', () => {
  async function inStatus(status: ProjectStatus, extra: Record<string, unknown> = {}) {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);
    const reference = await sendProject(await signedInCustomer(app));
    await forceStatus(reference, status, extra);
    return { app, admin, reference };
  }

  it('asks for a quote before sending one', async () => {
    const { admin, reference } = await inStatus('under-review');

    const response = await adminChange(admin, reference, { to: 'quote-sent' });

    expect(response.status).toBe(400);
    expect(errorOf(response.body).fields).toEqual({ quote: 'Enter the quote to send' });
    expect((await ProjectRequestModel.findOne({ reference }))?.status).toBe('under-review');
  });

  it('says what is wrong with a quote, field by field', async () => {
    const { admin, reference } = await inStatus('under-review');

    const response = await adminChange(admin, reference, {
      to: 'quote-sent',
      quote: { amountPaise: 50, scope: 'too short', revisionsIncluded: 99 },
    });

    expect(response.status).toBe(400);
    const fields = errorOf(response.body).fields ?? {};
    expect(fields['quote.amountPaise']).toBe('Enter the price, at least ₹1');
    expect(fields['quote.scope']).toMatch(/at least 20 characters/);
    expect(fields['quote.revisionsIncluded']).toBe('Enter 20 or fewer');
  });

  it('asks for a note when the customer must be told something, and for each of the six cancellations', async () => {
    const needNote: [ProjectStatus, ProjectStatus][] = statusTransitions
      .filter((t) => t.by.includes('admin') && t.needs === 'note')
      .map((t) => [t.from, t.to]);
    expect(needNote).toHaveLength(10);

    for (const [from, to] of needNote) {
      const { admin, reference } = await inStatus(from, {
        quotes: [
          {
            version: 1,
            ...goodQuote,
            sentAt: new Date(),
            sentBy: (await UserModel.findOne({ email: adminAccount.email }))?._id,
            sentByName: 'Prajzo Admin',
          },
        ],
      });
      const refused = await adminChange(admin, reference, { to });
      expect(refused.status, `${from} → ${to}`).toBe(400);
      expect(Object.keys(errorOf(refused.body).fields ?? {}), `${from} → ${to}`).toEqual(['note']);
      expect((await ProjectRequestModel.findOne({ reference }))?.status).toBe(from);

      const accepted = await adminChange(admin, reference, { to, note: 'Said so, plainly.' });
      expect(accepted.status, `${from} → ${to}: ${JSON.stringify(accepted.body)}`).toBe(200);
      await resetEverything();
    }
  });

  it('says what the note is for, in words that fit the move', async () => {
    const asks = [
      ['under-review', 'awaiting-information', /question|what you need/i],
      ['under-review', 'cancelled', /why the project is being cancelled/i],
      ['awaiting-review', 'revision-requested', /customer asked to change/i],
    ] as const;
    for (const [from, to, words] of asks) {
      const { admin, reference } = await inStatus(from);
      const response = await adminChange(admin, reference, { to });
      expect(errorOf(response.body).fields?.note, `${from} → ${to}`).toMatch(words);
      await resetEverything();
    }
  });

  it('asks for a delivery date before development starts, and uses one that was already set', async () => {
    const { admin, reference } = await inStatus('approved');

    const refused = await adminChange(admin, reference, { to: 'in-development' });
    expect(refused.status).toBe(400);
    expect(errorOf(refused.body).fields).toEqual({
      confirmedDeliveryDate: 'Choose the delivery date to confirm with the customer',
    });

    await ProjectRequestModel.updateOne({ reference }, { confirmedDeliveryDate: inDays(7) });
    const started = await adminChange(admin, reference, { to: 'in-development' });
    expect(started.status).toBe(200);
    // The date that was already there is kept, and no second "date" entry is added.
    const view = await adminView(admin, reference);
    expect(view.confirmedDeliveryDate).toBe(inDays(7));
    expect(view.timeline.filter((entry) => entry.kind === 'delivery-date')).toHaveLength(0);
  });

  it('refuses a delivery date that has passed, whether typed now or set long ago', async () => {
    const { admin, reference } = await inStatus('approved');
    const typed = await adminChange(admin, reference, {
      to: 'in-development',
      confirmedDeliveryDate: '2020-01-01',
    });
    expect(typed.status).toBe(400);
    expect(errorOf(typed.body).fields?.confirmedDeliveryDate).toBe(
      "Choose a date that hasn't passed",
    );

    await ProjectRequestModel.updateOne({ reference }, { confirmedDeliveryDate: '2020-01-01' });
    const stale = await adminChange(admin, reference, { to: 'in-development' });
    expect(stale.status).toBe(400);
    expect(errorOf(stale.body).fields?.confirmedDeliveryDate).toBe(
      'The delivery date has passed. Choose a new one',
    );
  });

  it('records the delivery date typed with the move, in the timeline', async () => {
    const { admin, reference } = await inStatus('approved');
    const date = inDays(12);

    await adminMoves(admin, reference, { to: 'in-development', confirmedDeliveryDate: date });

    const view = await adminView(admin, reference);
    expect(view.confirmedDeliveryDate).toBe(date);
    expect(view.timeline.map((entry) => entry.kind)).toEqual(['status', 'status', 'delivery-date']);
    expect(view.timeline[2]).toMatchObject({ kind: 'delivery-date', from: null, to: date });
  });

  it("refuses a quote or a date on a move they don't belong to", async () => {
    const { admin, reference } = await inStatus('received');

    const quote = await adminChange(admin, reference, { to: 'under-review', quote: goodQuote });
    expect(errorOf(quote.body).fields?.quote).toBe(
      'A quote can only be sent when moving to "Quote Sent"',
    );

    const date = await adminChange(admin, reference, {
      to: 'under-review',
      confirmedDeliveryDate: inDays(5),
    });
    expect(errorOf(date.body).fields?.confirmedDeliveryDate).toBe(
      'Set the delivery date from the delivery date box',
    );
    expect((await ProjectRequestModel.findOne({ reference }))?.status).toBe('received');
  });

  it('accepts an optional note on moves that do not need one', async () => {
    const { admin, reference } = await inStatus('received');
    const view = await adminMoves(admin, reference, {
      to: 'under-review',
      note: '  Looking at it now.  ',
    });
    expect(view.timeline.at(-1)).toMatchObject({ kind: 'status', note: 'Looking at it now.' });
  });
});

describe('quotes', () => {
  it('sends the first quote as version 1, with the price, the scope and the revisions included', async () => {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);
    const customer = await signedInCustomer(app);
    const reference = await projectWithQuote(customer, admin);

    const view = await adminView(admin, reference);

    expect(view.status).toBe('quote-sent');
    expect(view.quotes).toEqual([
      expect.objectContaining({
        version: 1,
        amountPaise: 1_500_000,
        scope: goodQuote.scope,
        revisionsIncluded: 2,
        accepted: false,
        sentByName: 'Prajzo Admin',
      }),
    ]);
    expect(view.waitingOn).toBe('customer');
  });

  it('keeps every version when a quote is revised, and the customer sees only the latest', async () => {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);
    const customer = await signedInCustomer(app);
    const reference = await projectWithQuote(customer, admin);

    // Revising: back to review, then a new quote.
    await adminMoves(admin, reference, { to: 'under-review', note: 'Adjusting the scope.' });
    expect((await customerView(customer, reference)).quote).toBeNull(); // nothing to answer while it is revised
    await adminMoves(admin, reference, {
      to: 'quote-sent',
      quote: { ...goodQuote, amountPaise: 1_200_000, revisionsIncluded: 3 },
    });

    const adminSees = await adminView(admin, reference);
    expect(adminSees.quotes.map((quote) => [quote.version, quote.amountPaise])).toEqual([
      [1, 1_500_000],
      [2, 1_200_000],
    ]);
    const customerSees = await customerView(customer, reference);
    expect(customerSees.quote).toMatchObject({
      version: 2,
      amountPaise: 1_200_000,
      revisionsIncluded: 3,
      accepted: false,
    });
  });
});

describe('an admin recording an acceptance that arrived another way', () => {
  it('approves the project, naming the latest quote, and sets the revisions it includes', async () => {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);
    const customer = await signedInCustomer(app);
    const reference = await projectWithQuote(customer, admin);

    const refused = await adminChange(admin, reference, { to: 'approved' });
    expect(refused.status).toBe(400);

    const view = await adminMoves(admin, reference, {
      to: 'approved',
      note: 'Accepted on WhatsApp on 24 Oct.',
    });

    expect(view.status).toBe('approved');
    expect(view.quotes[0]).toMatchObject({ version: 1, accepted: true });
    expect(view.revisions).toEqual({ included: 2, used: 0 });
    expect(view.timeline.at(-1)).toMatchObject({
      kind: 'status',
      to: 'approved',
      by: 'admin',
      note: 'Accepted on WhatsApp on 24 Oct.',
    });
    const stored = await ProjectRequestModel.findOne({ reference });
    expect(stored?.acceptedQuote).toMatchObject({ version: 1, by: 'admin' });
  });
});

describe("revisions asked for on the customer's behalf", () => {
  it('count against the revisions included, and are flagged once they go over', async () => {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);
    const customer = await signedInCustomer(app);
    const reference = await projectWithQuote(customer, admin);
    await adminMoves(admin, reference, { to: 'approved', note: 'Accepted by phone.' });
    await adminMoves(admin, reference, { to: 'in-development', confirmedDeliveryDate: inDays(10) });
    await adminMoves(admin, reference, { to: 'testing' });
    await adminMoves(admin, reference, { to: 'awaiting-review' });

    for (const expectedUsed of [1, 2, 3]) {
      const view = await adminMoves(admin, reference, {
        to: 'revision-requested',
        note: `Change number ${expectedUsed}`,
      });
      expect(view.revisions).toEqual({ included: 2, used: expectedUsed });
      expect(view.revisionsOverIncluded, `after ${expectedUsed}`).toBe(expectedUsed > 2);
      await adminMoves(admin, reference, { to: 'in-development' });
      await adminMoves(admin, reference, { to: 'testing' });
      await adminMoves(admin, reference, { to: 'awaiting-review' });
    }
  });
});

describe('when a customer has answered a question', () => {
  it('stops waiting on the customer as soon as an admin moves the project', async () => {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);
    const reference = await sendProject(await signedInCustomer(app));
    await adminMoves(admin, reference, { to: 'under-review' });
    await adminMoves(admin, reference, {
      to: 'awaiting-information',
      note: 'Please send your logo.',
    });
    await ProjectRequestModel.updateOne({ reference }, { customerReplyPending: true });
    expect(await adminView(admin, reference)).toMatchObject({
      customerReplied: true,
      waitingOn: 'prajzo',
    });

    const view = await adminMoves(admin, reference, { to: 'under-review' });

    expect(view.customerReplied).toBe(false);
    expect((await ProjectRequestModel.findOne({ reference }))?.customerReplyPending).toBe(false);
  });
});

describe('two changes at the same moment', () => {
  it('lets one win and tells the other what happened, leaving a single clean history', async () => {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);
    const reference = await sendProject(await signedInCustomer(app));

    const results = await Promise.all([
      adminChange(admin, reference, { to: 'under-review' }),
      adminChange(admin, reference, { to: 'cancelled' }),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    const stored = await ProjectRequestModel.findOne({ reference });
    expect(stored?.statusHistory).toHaveLength(2);
    const winner =
      results.findIndex((result) => result.status === 200) === 0 ? 'under-review' : 'cancelled';
    expect(stored?.status).toBe(winner);
  });

  it('never lets two admins send the same quote version twice', async () => {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);
    const reference = await sendProject(await signedInCustomer(app));
    await adminMoves(admin, reference, { to: 'under-review' });

    const results = await Promise.all([
      adminChange(admin, reference, { to: 'quote-sent', quote: goodQuote }),
      adminChange(admin, reference, {
        to: 'quote-sent',
        quote: { ...goodQuote, amountPaise: 999_900 },
      }),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    expect((await ProjectRequestModel.findOne({ reference }))?.quotes).toHaveLength(1);
  });
});

describe('what follows a status change', () => {
  it('emails the customer, and nobody else', async () => {
    const mailer = createCaptureMailer();
    const app = newProjectApp({}, mailer);
    const admin = await signedInAdmin(app);
    const reference = await sendProject(await signedInCustomer(app));
    mailer.sent.length = 0;

    await adminMoves(admin, reference, { to: 'under-review', note: 'Starting the review today.' });

    expect(mailer.sent).toHaveLength(1);
    const email = mailer.sent[0];
    expect(email?.to).toBe('asha@example.com');
    expect(email?.subject).toBe(`Update on your project ${reference}: Under Review`);
    expect(email?.text).toContain("We're reviewing your request.");
    expect(email?.text).toContain('A note from Prajzo:');
    expect(email?.text).toContain('Starting the review today.');
    expect(email?.text).toContain(`http://localhost:5173/account/projects/${reference}`);
  });

  it('puts the quote, with its price and scope, in the email that sends it', async () => {
    const mailer = createCaptureMailer();
    const app = newProjectApp({}, mailer);
    const admin = await signedInAdmin(app);
    const customer = await signedInCustomer(app);
    const reference = await projectWithQuote(customer, admin);

    const email = mailer.sent.filter((mail) => mail.to === 'asha@example.com').at(-1);

    expect(email?.subject).toBe(`Update on your project ${reference}: Quote Sent`);
    expect(email?.text).toContain('Your quote (version 1)');
    expect(email?.text).toContain(`Price: ${formatRupees(1_500_000)}`);
    expect(email?.text).toContain('Rounds of changes included: 2');
    expect(email?.text).toContain(goodQuote.scope);
  });

  it('shows the question, or the reason, under a heading that says what it is', async () => {
    const mailer = createCaptureMailer();
    const app = newProjectApp({}, mailer);
    const admin = await signedInAdmin(app);
    const reference = await sendProject(await signedInCustomer(app));
    await adminMoves(admin, reference, { to: 'under-review' });

    await adminMoves(admin, reference, {
      to: 'awaiting-information',
      note: 'Please send your logo.',
    });
    expect(mailer.sent.at(-1)?.text).toContain('What we need from you:\nPlease send your logo.');

    await adminMoves(admin, reference, { to: 'cancelled', note: 'No longer possible.' });
    expect(mailer.sent.at(-1)?.text).toContain('Why:\nNo longer possible.');
  });

  it('writes a line in the activity log with who did it, in plain words', async () => {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);
    const reference = await sendProject(await signedInCustomer(app));

    await adminMoves(admin, reference, { to: 'under-review' });

    const entry = await AuditLogModel.findOne({ action: 'project.status', targetId: reference });
    expect(entry).toMatchObject({
      actorName: 'Prajzo Admin',
      actorRole: 'admin',
      targetType: 'project',
      summary: `Moved ${reference} from Request Received to Under Review`,
    });
  });

  it('still changes the status when the email cannot be sent', async () => {
    const failing: Mailer = { send: () => Promise.reject(new Error('The mail server is down')) };
    const app = newProjectApp({}, failing);
    const admin = await signedInAdmin(app);
    const reference = await sendProject(await signedInCustomer(app));

    const response = await adminChange(admin, reference, { to: 'under-review' });

    expect(response.status).toBe(200);
    expect((await ProjectRequestModel.findOne({ reference }))?.status).toBe('under-review');
  });

  it("shows the customer the note and who made the change, but never the admin's name", async () => {
    const app = newProjectApp();
    const admin = await signedInAdmin(app);
    const customer = await signedInCustomer(app);
    const reference = await sendProject(customer);
    await adminMoves(admin, reference, { to: 'under-review', note: 'Starting the review today.' });

    const response = await customer.get(`/api/v1/project-requests/${reference}`);

    expect(JSON.stringify(response.body)).not.toContain('Prajzo Admin');
    const entry = (await customerView(customer, reference)).timeline.at(-1);
    expect(entry).toMatchObject({
      kind: 'status',
      to: 'under-review',
      by: 'admin',
      note: 'Starting the review today.',
    });
  });
});
