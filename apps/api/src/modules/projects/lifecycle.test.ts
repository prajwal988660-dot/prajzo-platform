import { formatRupees } from '@prajzo/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createCaptureMailer } from '../../services/mailer';
import {
  adminMoves,
  adminView,
  customerDoes,
  customerView,
  goodQuote,
  inDays,
  newProjectApp,
  resetEverything,
  sendProject,
  signedInAdmin,
  signedInCustomer,
} from '../../test/project-helpers';
import { startTestDatabase } from '../../test/helpers';
import { AuditLogModel } from '../audit/audit-log.model';
import { ensureCatalogueDefaults } from '../catalogue/catalogue.service';

let database: { stop: () => Promise<void> };

beforeAll(async () => {
  database = await startTestDatabase();
  await ensureCatalogueDefaults();
});

afterAll(async () => {
  await database.stop();
});

beforeEach(resetEverything);

/** Steps that happen in the same millisecond could not be put in order, so leave a gap. */
const moment = () => new Promise((resolve) => setTimeout(resolve, 4));

describe('a project from the first request to the last', () => {
  it('goes from "Request Received" to "Completed", with the customer answering, accepting and asking for a change on the way', async () => {
    const mailer = createCaptureMailer();
    const app = newProjectApp({}, mailer);
    const admin = await signedInAdmin(app);
    const customer = await signedInCustomer(app, 'asha@example.com', 'Asha Rao');
    const date = inDays(14);

    // 1. The customer sends the request.
    const reference = await sendProject(customer);
    await moment();
    expect((await customerView(customer, reference)).allowedActions).toEqual(['cancel']);

    // 2. Prajzo reviews it and asks a question; the customer answers.
    await adminMoves(admin, reference, { to: 'under-review' });
    await moment();
    await adminMoves(admin, reference, {
      to: 'awaiting-information',
      note: 'Please send your logo and brand colours.',
    });
    await moment();
    expect((await customerView(customer, reference)).allowedActions).toEqual(['cancel', 'reply']);
    expect(
      (
        await customerDoes(customer, reference, {
          action: 'reply',
          message: 'Logo attached on WhatsApp. Blue and white.',
        })
      ).status,
    ).toBe(200);
    await moment();
    expect(await adminView(admin, reference)).toMatchObject({
      customerReplied: true,
      waitingOn: 'prajzo',
    });
    await adminMoves(admin, reference, { to: 'under-review' });
    await moment();

    // 3. Prajzo sends a quote; the customer accepts it.
    await adminMoves(admin, reference, { to: 'quote-sent', quote: goodQuote });
    await moment();
    expect((await customerView(customer, reference)).quote).toMatchObject({
      version: 1,
      accepted: false,
    });
    expect(
      (await customerDoes(customer, reference, { action: 'accept-quote', quoteVersion: 1 })).status,
    ).toBe(200);
    await moment();

    // 4. Prajzo confirms the date and builds it; the customer asks for one change.
    await adminMoves(admin, reference, { to: 'in-development', confirmedDeliveryDate: date });
    await moment();
    await adminMoves(admin, reference, { to: 'testing' });
    await adminMoves(admin, reference, {
      to: 'awaiting-review',
      note: 'Ready for you to look at.',
    });
    await moment();
    expect((await customerView(customer, reference)).allowedActions).toEqual([
      'request-revision',
      'sign-off',
    ]);
    expect(
      (
        await customerDoes(customer, reference, {
          action: 'request-revision',
          message: 'Please make the logo a little bigger.',
        })
      ).status,
    ).toBe(200);
    await moment();
    await adminMoves(admin, reference, { to: 'in-development' });
    await adminMoves(admin, reference, { to: 'testing' });
    await adminMoves(admin, reference, { to: 'awaiting-review' });
    await moment();

    // 5. The customer says it looks good; Prajzo completes the project.
    expect((await customerDoes(customer, reference, { action: 'sign-off' })).status).toBe(200);
    await moment();
    await adminMoves(admin, reference, {
      to: 'completed',
      note: 'Signed off by the customer. Thank you!',
    });

    // The customer's view of the finished project.
    const done = await customerView(customer, reference);
    expect(done).toMatchObject({
      status: 'completed',
      confirmedDeliveryDate: date,
      revisions: { included: 2, used: 1 },
      allowedActions: [],
    });
    expect(done.quote).toMatchObject({ version: 1, amountPaise: 1_500_000, accepted: true });

    const steps = done.timeline.map((entry) => {
      if (entry.kind === 'status') return `${entry.to} (${entry.by})`;
      return `${entry.kind} (${entry.by})`;
    });
    expect(steps).toEqual([
      'received (customer)',
      'under-review (admin)',
      'awaiting-information (admin)',
      'reply (customer)',
      'under-review (admin)',
      'quote-sent (admin)',
      'approved (customer)',
      'in-development (admin)',
      'delivery-date (admin)',
      'testing (admin)',
      'awaiting-review (admin)',
      'revision-requested (customer)',
      'in-development (admin)',
      'testing (admin)',
      'awaiting-review (admin)',
      'sign-off (customer)',
      'completed (admin)',
    ]);
    const times = done.timeline.map((entry) => new Date(entry.at).getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));

    // The admin's view: nobody left to wait for, who did what, and the revision count.
    const seen = await adminView(admin, reference);
    expect(seen).toMatchObject({
      status: 'completed',
      waitingOn: null,
      customerReplied: false,
      revisionsOverIncluded: false,
    });
    expect(seen.allowedChanges).toEqual([]);
    expect(
      seen.timeline.filter((entry) => entry.kind === 'status').map((entry) => entry.actorName),
    ).toEqual([
      'Asha Rao',
      'Prajzo Admin',
      'Prajzo Admin',
      'Prajzo Admin',
      'Prajzo Admin',
      'Asha Rao',
      'Prajzo Admin',
      'Prajzo Admin',
      'Prajzo Admin',
      'Asha Rao',
      'Prajzo Admin',
      'Prajzo Admin',
      'Prajzo Admin',
      'Prajzo Admin',
    ]);

    // Every step was emailed to the customer, and every customer step to Prajzo.
    const toCustomer = mailer.sent.filter((mail) => mail.to === 'asha@example.com');
    const toPrajzo = mailer.sent.filter((mail) => mail.to === 'contact@prajzo.com');
    expect(toCustomer).toHaveLength(12); // the confirmation, and 11 moves by Prajzo
    expect(toPrajzo.map((mail) => mail.subject)).toEqual([
      `New project request ${reference}: Website for my studio`,
      `${reference}: Asha Rao answered your question`,
      `${reference}: Asha Rao accepted the quote`,
      `${reference}: Asha Rao asked for a revision`,
      `${reference}: Asha Rao says it looks good`,
    ]);
    expect(toCustomer.some((mail) => mail.text.includes(`Price: ${formatRupees(1_500_000)}`))).toBe(
      true,
    );
    expect(toCustomer.at(-1)?.subject).toBe(`Update on your project ${reference}: Completed`);

    // And everything is in the activity log, with who did it.
    const log = await AuditLogModel.find({ targetId: reference }).sort({ at: 1, _id: 1 });
    expect(log).toHaveLength(16); // 1 request, 11 moves, 4 customer actions
    expect(log.filter((entry) => entry.actorRole === 'customer')).toHaveLength(5);
    expect(log.filter((entry) => entry.actorRole === 'admin')).toHaveLength(11);
    expect(log[0]?.action).toBe('project.created');
    expect(log.at(-1)?.summary).toBe(
      `Moved ${reference} from Awaiting Customer Review to Completed`,
    );
  });

  it('can end earlier: declined at the quote, or called off by Prajzo with a reason', async () => {
    const mailer = createCaptureMailer();
    const app = newProjectApp({}, mailer);
    const admin = await signedInAdmin(app);
    const customer = await signedInCustomer(app);

    const declined = await sendProject(customer);
    await adminMoves(admin, declined, { to: 'under-review' });
    await adminMoves(admin, declined, { to: 'quote-sent', quote: goodQuote });
    await customerDoes(customer, declined, {
      action: 'decline-quote',
      quoteVersion: 1,
      note: 'Over my budget',
    });
    const sawDeclined = await adminView(admin, declined);
    expect(sawDeclined).toMatchObject({ status: 'cancelled', waitingOn: null });
    expect(sawDeclined.allowedChanges).toEqual([]);

    const calledOff = await sendProject(customer, { title: 'A second website' });
    await adminMoves(admin, calledOff, { to: 'under-review' });
    await adminMoves(admin, calledOff, {
      to: 'cancelled',
      note: 'We cannot take this on right now.',
    });
    const mail = mailer.sent.filter((m) => m.to === 'asha@example.com').at(-1);
    expect(mail?.text).toContain('Why:\nWe cannot take this on right now.');
    expect((await customerView(customer, calledOff)).allowedActions).toEqual([]);
  });
});
