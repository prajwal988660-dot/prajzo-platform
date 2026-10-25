import { addDays, formatCalendarDate, todayInIndia, type AdminProjectDetail } from '@prajzo/shared';
import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  catalogueRoutes,
  jsonBody,
  jsonResponse,
  mockApi,
  requestedUrls,
  sampleAdmin,
  sampleAdminProject,
  sampleAdminQuote,
  signedInAs,
} from '../../test/mock-api';
import { renderApp } from '../../test/render-app';

type Routes = Parameters<typeof mockApi>[0];
const reference = 'PRZ-2026-0001';
const base = `/api/v1/admin/project-requests/${reference}`;
const projectUrl = `GET ${base}`;
const statusUrl = `POST ${base}/status`;
const dateUrl = `POST ${base}/delivery-date`;
const notesUrl = `POST ${base}/notes`;

function openProject(project: AdminProjectDetail = sampleAdminProject(), extra: Routes = {}) {
  const fetchMock = mockApi({
    ...catalogueRoutes(),
    ...signedInAs(sampleAdmin),
    [projectUrl]: () => jsonResponse(200, { project }),
    ...extra,
  });
  const user = userEvent.setup();
  const router = renderApp(`/admin/projects/${reference}`);
  return { fetchMock, user, router };
}

/** A labelled section of the page. */
const section = async (name: string) => within(await screen.findByRole('region', { name }));

const at = '2026-10-24T04:30:00.000Z';
const received = {
  kind: 'status',
  from: null,
  to: 'received',
  by: 'customer',
  note: null,
  at: '2026-10-23T13:30:00.000Z',
  actorName: 'Asha Rao',
} as const;
const adminStatus = (to: AdminProjectDetail['status'], note: string | null = null) =>
  ({ kind: 'status', from: null, to, by: 'admin', note, at, actorName: 'Prajzo Admin' }) as const;

const underReview = (overrides: Partial<AdminProjectDetail> = {}) =>
  sampleAdminProject({
    status: 'under-review',
    timeline: [received, adminStatus('under-review')],
    allowedChanges: [
      { to: 'awaiting-information', needs: 'note' },
      { to: 'quote-sent', needs: 'quote' },
      { to: 'cancelled', needs: 'note' },
    ],
    ...overrides,
  });

const approved = (overrides: Partial<AdminProjectDetail> = {}) =>
  sampleAdminProject({
    status: 'approved',
    quotes: [sampleAdminQuote({ accepted: true })],
    revisions: { included: 2, used: 0 },
    timeline: [received, adminStatus('approved')],
    allowedChanges: [
      { to: 'in-development', needs: 'deliveryDate' },
      { to: 'cancelled', needs: 'note' },
    ],
    ...overrides,
  });

const awaitingReview = (overrides: Partial<AdminProjectDetail> = {}) =>
  sampleAdminProject({
    status: 'awaiting-review',
    quotes: [sampleAdminQuote({ accepted: true })],
    revisions: { included: 2, used: 1 },
    waitingOn: 'customer',
    timeline: [received, adminStatus('awaiting-review')],
    allowedChanges: [
      { to: 'revision-requested', needs: 'note' },
      { to: 'completed', needs: null },
      { to: 'cancelled', needs: 'note' },
    ],
    ...overrides,
  });

const finished = (status: 'completed' | 'cancelled') =>
  sampleAdminProject({
    status,
    waitingOn: null,
    allowedChanges: [],
    timeline: [received, adminStatus(status)],
  });

describe('the admin project page: what it shows', () => {
  it('shows the reference, name, customer, status and who has to act', async () => {
    openProject();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Website for my studio' }),
    ).toBeVisible();
    expect(screen.getByText('PRZ-2026-0001')).toBeVisible();
    expect(screen.getByText(/Business Websites · sent 23 Oct 2026 by Asha Rao/)).toBeVisible();
    expect(screen.getAllByText('Request Received').length).toBeGreaterThan(0);
    expect(screen.getByText('Needs you')).toBeVisible();
    expect(screen.getByRole('link', { name: 'All projects' })).toHaveAttribute(
      'href',
      '/admin/projects',
    );
  });

  it('shows everything the customer asked for, worded for an admin', async () => {
    openProject();
    const request = await section('The request');

    expect(request.getByText('Professional Website')).toBeVisible();
    expect(request.getByText(/five-page website/)).toBeVisible();
    expect(request.getByText('Photo or video gallery, Contact or enquiry form')).toBeVisible();
    expect(request.getByText('Google Maps')).toBeVisible();
    expect(request.getByText(/1 Dec 2026/)).toBeVisible();
    expect(request.getByText('How they want to be contacted')).toBeVisible();
    expect(request.getByText('WhatsApp · +91 98866 07720')).toBeVisible();
    expect(request.getByText('Please message after 5 pm.')).toBeVisible();
  });

  it('says where it came from when the project did not come from the start form', async () => {
    openProject(sampleAdminProject({ source: 'builder' }));
    expect(await screen.findByText(/from the website builder/)).toBeVisible();
  });

  it('says it could not be found when the server says 404', async () => {
    openProject(sampleAdminProject(), {
      [projectUrl]: () =>
        jsonResponse(404, { error: { code: 'NOT_FOUND', message: 'No such project.' } }),
    });
    expect(
      await screen.findByRole('heading', { level: 1, name: "We couldn't find that project" }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'See all projects' })).toHaveAttribute(
      'href',
      '/admin/projects',
    );
  });

  it('says so, and tries again on request, when it cannot be loaded', async () => {
    let calls = 0;
    const { user } = openProject(sampleAdminProject(), {
      [projectUrl]: () => {
        calls += 1;
        return calls === 1
          ? jsonResponse(503, {
              error: {
                code: 'SERVICE_UNAVAILABLE',
                message: 'This part of the site is temporarily unavailable.',
              },
            })
          : jsonResponse(200, { project: sampleAdminProject() });
      },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('temporarily unavailable');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Website for my studio' }),
    ).toBeVisible();
  });
});

describe('where things stand', () => {
  it.each([
    [sampleAdminProject(), 'A new request', 'Read it, then start the review.'],
    [underReview(), 'Waiting for you', 'Send a quote, or ask the customer for what you need.'],
    [
      approved(),
      'The customer accepted the quote',
      'Confirm a delivery date and start development.',
    ],
    [
      sampleAdminProject({ status: 'quote-sent', waitingOn: 'customer' }),
      'Waiting for the customer',
      'They can accept or decline the quote. Nothing starts until they accept.',
    ],
    [awaitingReview(), 'Waiting for the customer', 'They are reviewing the finished project.'],
    [finished('completed'), 'Completed', 'This project is finished.'],
    [finished('cancelled'), 'Cancelled', 'No further work will be done on it.'],
  ])("says what is happening, in an admin's words (%#)", async (project, title, text) => {
    openProject(project);
    const standing = await section('Where things stand');
    expect(standing.getByText(title)).toBeVisible();
    expect(standing.getByText(text)).toBeVisible();
  });

  it("shows the customer's answer when they replied, and flags it", async () => {
    openProject(
      sampleAdminProject({
        status: 'awaiting-information',
        customerReplied: true,
        waitingOn: 'prajzo',
        timeline: [
          received,
          adminStatus('awaiting-information', 'Please send your logo.'),
          {
            kind: 'reply',
            by: 'customer',
            text: 'Logo is on WhatsApp.',
            at,
            actorName: 'Asha Rao',
          },
        ],
      }),
    );

    const standing = await section('Where things stand');
    expect(standing.getByText('The customer answered your question')).toBeVisible();
    expect(standing.getByText('“Logo is on WhatsApp.”')).toBeVisible();
    expect(screen.getAllByText('Customer replied').length).toBeGreaterThan(0);
  });

  it('says when the customer has signed off, so the project can be completed', async () => {
    openProject(awaitingReview({ customerSignedOff: true, waitingOn: 'prajzo' }));

    const standing = await section('Where things stand');
    expect(standing.getByText('The customer said it looks good')).toBeVisible();
    expect(standing.getByText("Complete the project when you're ready.")).toBeVisible();
    expect(screen.getByText('Said it looks good')).toBeVisible();
    expect(screen.getByText('Needs you')).toBeVisible();
  });

  it('flags a customer who has asked for more changes than the quote includes', async () => {
    openProject(
      sampleAdminProject({
        status: 'revision-requested',
        revisions: { included: 2, used: 3 },
        revisionsOverIncluded: true,
        quotes: [sampleAdminQuote({ accepted: true })],
      }),
    );

    expect(await screen.findByText('Over the included changes')).toBeVisible();
    const revisions = await section('Rounds of changes');
    expect(revisions.getByText('3 of 2')).toBeVisible();
    expect(revisions.getByText('More than the quote includes')).toBeVisible();
  });

  it('shows how many rounds of changes are used, with no warning while within the quote', async () => {
    openProject(awaitingReview());
    const revisions = await section('Rounds of changes');
    expect(revisions.getByText('1 of 2')).toBeVisible();
    expect(revisions.queryByText('More than the quote includes')).not.toBeInTheDocument();
  });

  it('shows no rounds of changes before a quote is accepted', async () => {
    openProject();
    await screen.findByRole('heading', { level: 1, name: 'Website for my studio' });
    expect(screen.queryByRole('region', { name: 'Rounds of changes' })).not.toBeInTheDocument();
  });
});

describe('the customer', () => {
  it('can be reached by email, phone or WhatsApp, and their other projects are one click away', async () => {
    openProject();
    const customer = await section('Customer');

    expect(customer.getByText('Asha Rao')).toBeVisible();
    expect(customer.getByRole('link', { name: 'asha@example.com' })).toHaveAttribute(
      'href',
      'mailto:asha@example.com?subject=PRZ-2026-0001%3A%20Website%20for%20my%20studio',
    );
    expect(customer.getByRole('link', { name: '+91 98866 07720' })).toHaveAttribute(
      'href',
      'tel:+919886607720',
    );
    const whatsapp = customer.getByRole('link', { name: /Message on WhatsApp/ });
    expect(whatsapp.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/919886607720\?text=/);
    expect(whatsapp).toHaveAttribute('target', '_blank');
    expect(whatsapp).toHaveAttribute('rel', 'noreferrer');
    expect(customer.getByRole('link', { name: /All of this customer's projects/ })).toHaveAttribute(
      'href',
      '/admin/customers/user-1',
    );
  });

  it('shows only the email when there is no phone number', async () => {
    openProject(
      sampleAdminProject({
        customer: { id: 'user-1', name: 'Asha Rao', email: 'asha@example.com', phone: null },
      }),
    );
    const customer = await section('Customer');
    expect(customer.getByRole('link', { name: 'asha@example.com' })).toBeVisible();
    expect(customer.queryByRole('link', { name: /WhatsApp/ })).not.toBeInTheDocument();
    expect(customer.queryByText(/98866/)).not.toBeInTheDocument();
  });

  it('shows a phone number that cannot be dialled as plain text, not as a broken link', async () => {
    openProject(
      sampleAdminProject({
        customer: { id: 'user-1', name: 'Asha Rao', email: 'asha@example.com', phone: '12345' },
      }),
    );
    const customer = await section('Customer');
    expect(customer.getByText('12345')).toBeVisible();
    expect(customer.queryByRole('link', { name: '12345' })).not.toBeInTheDocument();
    expect(customer.queryByRole('link', { name: /WhatsApp/ })).not.toBeInTheDocument();
  });
});

describe('the timeline and the quotes', () => {
  it('names who did each thing', async () => {
    openProject(
      sampleAdminProject({
        status: 'awaiting-review',
        timeline: [
          received,
          adminStatus('under-review', 'Starting the review.'),
          { kind: 'reply', by: 'customer', text: 'Logo attached.', at, actorName: 'Asha Rao' },
          {
            kind: 'delivery-date',
            by: 'admin',
            from: null,
            to: '2026-11-05',
            note: null,
            at,
            actorName: 'Prajzo Admin',
          },
          { kind: 'sign-off', by: 'customer', at, actorName: 'Asha Rao' },
        ],
      }),
    );

    const timeline = await section('Timeline');
    const steps = timeline.getAllByRole('listitem');
    expect(steps).toHaveLength(5);
    expect(within(steps[0]!).getByText(/^Asha Rao ·/)).toBeVisible();
    expect(within(steps[1]!).getByText('Under Review')).toBeVisible();
    expect(within(steps[1]!).getByText(/^Prajzo Admin ·/)).toBeVisible();
    expect(within(steps[1]!).getByText('“Starting the review.”')).toBeVisible();
    expect(within(steps[2]!).getByText('Answered the question')).toBeVisible();
    expect(within(steps[3]!).getByText('Delivery date confirmed: 5 Nov 2026')).toBeVisible();
    expect(within(steps[4]!).getByText('Said the project looks good')).toBeVisible();
  });

  it('lists every quote that was sent, newest first, and which one was accepted', async () => {
    openProject(
      sampleAdminProject({
        status: 'approved',
        quotes: [
          sampleAdminQuote({ version: 1, amountPaise: 2_000_000, accepted: false }),
          sampleAdminQuote({
            version: 2,
            amountPaise: 1_500_000,
            accepted: true,
            revisionsIncluded: 1,
            sentByName: 'Meera Joshi',
          }),
        ],
        revisions: { included: 1, used: 0 },
      }),
    );

    const quotes = await section('Quotes');
    const items = quotes.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(within(items[0]!).getByText('₹15,000')).toBeVisible();
    expect(within(items[0]!).getByText('Quote 2')).toBeVisible();
    expect(within(items[0]!).getByText('Accepted')).toBeVisible();
    expect(within(items[0]!).getByText(/1 round of changes included/)).toBeVisible();
    expect(within(items[0]!).getByText(/sent by Meera Joshi/)).toBeVisible();
    expect(within(items[1]!).getByText('₹20,000')).toBeVisible();
    expect(within(items[1]!).getByText('Replaced')).toBeVisible();
  });

  it('marks the newest unanswered quote as the latest', async () => {
    openProject(
      sampleAdminProject({
        status: 'quote-sent',
        quotes: [sampleAdminQuote()],
        waitingOn: 'customer',
      }),
    );
    const quotes = await section('Quote');
    expect(quotes.getByText('Latest')).toBeVisible();
  });

  it('shows no quote section before any quote was sent', async () => {
    openProject();
    await screen.findByRole('heading', { level: 1, name: 'Website for my studio' });
    expect(screen.queryByRole('heading', { name: /^Quotes?$/ })).not.toBeInTheDocument();
  });
});

describe('moving a project on', () => {
  it('lists only the moves the server allows, and shows no form until one is chosen', async () => {
    openProject();
    const panel = await section('Move this project on');

    const options = within(panel.getByLabelText('Move to'))
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(options).toEqual(['Choose a status…', 'Under Review', 'Cancelled']);
    expect(panel.queryByRole('button', { name: /Move to/ })).not.toBeInTheDocument();
  });

  it('moves a project on with nothing more, showing the customer what they will see', async () => {
    let sent: unknown;
    const moved = underReview();
    const { user } = openProject(sampleAdminProject(), {
      [statusUrl]: (init) => {
        sent = jsonBody(init);
        return jsonResponse(200, { project: moved });
      },
    });
    const panel = await section('Move this project on');
    await user.selectOptions(panel.getByLabelText('Move to'), 'Under Review');
    expect(panel.getByText(/The customer will see:/)).toHaveTextContent(
      "We're reviewing your request.",
    );

    await user.click(panel.getByRole('button', { name: 'Move to Under Review' }));

    expect(await screen.findByText('Moved to Under Review')).toBeVisible();
    expect(sent).toEqual({ to: 'under-review' });
    expect(
      screen.getByText('The customer can see the new status on their project page.'),
    ).toBeVisible();
    // The panel starts afresh with the moves that are possible now, and focus moves to the news.
    const options = within(screen.getByLabelText('Move to'))
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(options).toEqual([
      'Choose a status…',
      'Awaiting Customer Information',
      'Quote Sent',
      'Cancelled',
    ]);
    expect(screen.getByText('Moved to Under Review').closest('[tabindex="-1"]')).toHaveFocus();
    expect(screen.getAllByText('Under Review').length).toBeGreaterThan(0);
  });

  it('sends a note along when one is written', async () => {
    let sent: unknown;
    const { user } = openProject(sampleAdminProject(), {
      [statusUrl]: (init) => {
        sent = jsonBody(init);
        return jsonResponse(200, { project: underReview() });
      },
    });
    const panel = await section('Move this project on');
    await user.selectOptions(panel.getByLabelText('Move to'), 'Under Review');
    await user.type(panel.getByLabelText('Note for the customer (optional)'), '  Starting today  ');

    await user.click(panel.getByRole('button', { name: 'Move to Under Review' }));

    await screen.findByText('Moved to Under Review');
    expect(sent).toEqual({ to: 'under-review', note: 'Starting today' });
  });

  it('starts a fresh form when another move is chosen', async () => {
    const { user } = openProject();
    const panel = await section('Move this project on');
    await user.selectOptions(panel.getByLabelText('Move to'), 'Under Review');
    await user.type(panel.getByLabelText('Note for the customer (optional)'), 'Typed for review');

    await user.selectOptions(panel.getByLabelText('Move to'), 'Cancelled');
    await user.selectOptions(panel.getByLabelText('Move to'), 'Under Review');

    expect(panel.getByLabelText('Note for the customer (optional)')).toHaveValue('');
  });

  it('shows nothing to move when the project is finished', async () => {
    openProject(finished('completed'));
    const panel = await section('Move this project on');
    expect(
      panel.getByText(/This project is Completed\. Its status can't be changed any more\./),
    ).toBeVisible();
    expect(panel.queryByLabelText('Move to')).not.toBeInTheDocument();
  });

  describe('when a note for the customer is needed', () => {
    it('asks a question of the customer, and refuses an empty one without asking the server', async () => {
      let sent: unknown;
      const asked = sampleAdminProject({
        status: 'awaiting-information',
        waitingOn: 'customer',
        timeline: [received, adminStatus('awaiting-information', 'Please send your logo.')],
        allowedChanges: [
          { to: 'under-review', needs: null },
          { to: 'cancelled', needs: null },
        ],
      });
      const { fetchMock, user } = openProject(underReview(), {
        [statusUrl]: (init) => {
          sent = jsonBody(init);
          return jsonResponse(200, { project: asked });
        },
      });
      const panel = await section('Move this project on');
      await user.selectOptions(panel.getByLabelText('Move to'), 'Awaiting Customer Information');

      await user.click(
        panel.getByRole('button', { name: 'Move to Awaiting Customer Information' }),
      );
      expect(
        await panel.findByText(
          'Write the question, or say what you need, so the customer knows what to send',
        ),
      ).toBeVisible();
      expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);

      await user.type(
        panel.getByLabelText(/^Your question for the customer/),
        'Please send your logo.',
      );
      await user.click(
        panel.getByRole('button', { name: 'Move to Awaiting Customer Information' }),
      );

      expect(await screen.findByText('Moved to Awaiting Customer Information')).toBeVisible();
      expect(sent).toEqual({ to: 'awaiting-information', note: 'Please send your logo.' });
    });

    it.each([['Cancelled', 'Say why the project is being cancelled. The customer will see it']])(
      'asks why, before moving to %s',
      async (label, message) => {
        const { user } = openProject(underReview());
        const panel = await section('Move this project on');
        await user.selectOptions(panel.getByLabelText('Move to'), label);
        await user.click(panel.getByLabelText(/I understand that/));

        await user.click(panel.getByRole('button', { name: `Move to ${label}` }));

        expect(await panel.findByText(message)).toBeVisible();
      },
    );

    it("shows the server's reason beside the note when it still refuses", async () => {
      const { user } = openProject(underReview(), {
        [statusUrl]: () =>
          jsonResponse(400, {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Please check what you entered.',
              fields: { note: 'Write the question, or say what you need' },
            },
          }),
      });
      const panel = await section('Move this project on');
      await user.selectOptions(panel.getByLabelText('Move to'), 'Awaiting Customer Information');
      await user.type(panel.getByLabelText(/^Your question for the customer/), 'Anything');

      await user.click(
        panel.getByRole('button', { name: 'Move to Awaiting Customer Information' }),
      );

      expect(await panel.findByText('Write the question, or say what you need')).toBeVisible();
      expect(await panel.findByRole('alert')).toHaveTextContent("The status wasn't changed");
    });
  });

  describe('when a quote is needed', () => {
    const chooseQuote = async (project = underReview(), extra: Routes = {}) => {
      const opened = openProject(project, extra);
      const panel = await section('Move this project on');
      await opened.user.selectOptions(panel.getByLabelText('Move to'), 'Quote Sent');
      return { ...opened, panel };
    };

    it('asks for the price, what it includes, and the rounds of changes', async () => {
      const { panel } = await chooseQuote();
      expect(panel.getByLabelText(/^Price \(₹\)/)).toBeVisible();
      expect(panel.getByLabelText(/^What the price includes/)).toBeVisible();
      expect(panel.getByLabelText(/^Rounds of changes included/)).toBeVisible();
      expect(panel.getByLabelText('Message to go with the quote (optional)')).toBeVisible();
      expect(panel.getByRole('button', { name: 'Send quote' })).toBeVisible();
    });

    it('says what is wrong with each field, and sends nothing', async () => {
      const { fetchMock, user, panel } = await chooseQuote();

      await user.click(panel.getByRole('button', { name: 'Send quote' }));

      expect(await panel.findByText('Enter the price in rupees, for example 15000')).toBeVisible();
      expect(
        panel.getByText('Describe what the price includes (at least 20 characters)'),
      ).toBeVisible();
      expect(
        panel.getByText('Enter the number of rounds of changes included, for example 2'),
      ).toBeVisible();
      expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
    });

    it.each([
      ['0.50', 'Enter the price, at least ₹1'],
      ['1.50', 'Enter a whole number of rupees'],
      ['abc', 'Enter the price in rupees, for example 15000'],
      ['99999999', 'That is more than ₹1 crore. Please check the price'],
    ])('refuses the price "%s"', async (typed, message) => {
      const { user, panel } = await chooseQuote();
      await user.type(panel.getByLabelText(/^Price/), typed);
      await user.click(panel.getByRole('button', { name: 'Send quote' }));
      expect(await panel.findByText(message)).toBeVisible();
    });

    it('sends the quote in paise, with the scope and the rounds of changes', async () => {
      let sent: unknown;
      const quoted = sampleAdminProject({
        status: 'quote-sent',
        waitingOn: 'customer',
        quotes: [sampleAdminQuote()],
        timeline: [received, adminStatus('under-review'), adminStatus('quote-sent')],
        allowedChanges: [
          { to: 'approved', needs: 'note' },
          { to: 'under-review', needs: null },
          { to: 'cancelled', needs: null },
        ],
      });
      const { user, panel } = await chooseQuote(underReview(), {
        [statusUrl]: (init) => {
          sent = jsonBody(init);
          return jsonResponse(200, { project: quoted });
        },
      });
      await user.type(panel.getByLabelText(/^Price/), '15000');
      await user.type(
        panel.getByLabelText(/^What the price includes/),
        'A five-page website with a gallery and a contact form.',
      );
      await user.type(panel.getByLabelText(/^Rounds of changes included/), '2');
      await user.type(
        panel.getByLabelText('Message to go with the quote (optional)'),
        'Thank you!',
      );

      await user.click(panel.getByRole('button', { name: 'Send quote' }));

      expect(await screen.findByText('Moved to Quote Sent')).toBeVisible();
      expect(sent).toEqual({
        to: 'quote-sent',
        note: 'Thank you!',
        quote: {
          amountPaise: 1_500_000,
          scope: 'A five-page website with a gallery and a contact form.',
          revisionsIncluded: 2,
        },
      });
      expect(
        screen.getByText('The quote was sent. The customer can read it on their project page.'),
      ).toBeVisible();
      // It is now listed with the other quotes.
      expect((await section('Quote')).getByText('₹15,000')).toBeVisible();
    });

    it('accepts rupees with paise typed in, as long as they are whole rupees', async () => {
      let sent: { quote?: { amountPaise?: number } } | undefined;
      const { user, panel } = await chooseQuote(underReview(), {
        [statusUrl]: (init) => {
          sent = jsonBody(init) as typeof sent;
          return jsonResponse(200, { project: underReview() });
        },
      });
      await user.type(panel.getByLabelText(/^Price/), '12500.00');
      await user.type(panel.getByLabelText(/^What the price includes/), 'x'.repeat(25));
      await user.type(panel.getByLabelText(/^Rounds of changes included/), '0');

      await user.click(panel.getByRole('button', { name: 'Send quote' }));

      await screen.findByText('Moved to Quote Sent');
      expect(sent?.quote?.amountPaise).toBe(1_250_000);
    });

    it('starts a re-sent quote from the last one, so only what changed needs editing', async () => {
      const { panel } = await chooseQuote(
        underReview({
          quotes: [
            sampleAdminQuote({
              amountPaise: 1_500_000,
              scope: 'The old scope of the first quote.',
              revisionsIncluded: 3,
            }),
          ],
        }),
      );
      expect(panel.getByLabelText(/^Price/)).toHaveValue('15000');
      expect(panel.getByLabelText(/^What the price includes/)).toHaveValue(
        'The old scope of the first quote.',
      );
      expect(panel.getByLabelText(/^Rounds of changes included/)).toHaveValue('3');
    });

    it("leaves the first quote's fields empty, rather than inventing a price or a number of rounds", async () => {
      const { panel } = await chooseQuote();
      expect(panel.getByLabelText(/^Price/)).toHaveValue('');
      expect(panel.getByLabelText(/^Rounds of changes included/)).toHaveValue('');
    });
  });

  describe('when a delivery date is needed', () => {
    it('asks for the date, starting from the one already confirmed', async () => {
      const date = addDays(todayInIndia(), 14);
      const { user } = openProject(approved({ confirmedDeliveryDate: date }));
      const panel = await section('Move this project on');

      await user.selectOptions(panel.getByLabelText('Move to'), 'In Development');

      expect(panel.getByLabelText(/^Delivery date/)).toHaveValue(date);
      expect(panel.getByLabelText(/^Delivery date/)).toHaveAttribute('min', todayInIndia());
    });

    it('refuses a missing or past date without asking the server', async () => {
      const { fetchMock, user } = openProject(approved());
      const panel = await section('Move this project on');
      await user.selectOptions(panel.getByLabelText('Move to'), 'In Development');

      await user.click(panel.getByRole('button', { name: 'Move to In Development' }));
      expect(await panel.findByText('Choose a date from the calendar')).toBeVisible();

      fireEvent.change(panel.getByLabelText(/^Delivery date/), {
        target: { value: addDays(todayInIndia(), -1) },
      });
      await user.click(panel.getByRole('button', { name: 'Move to In Development' }));
      expect(await panel.findByText("Choose a date that hasn't passed")).toBeVisible();
      expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
    });

    it('starts development with the date that was chosen', async () => {
      let sent: unknown;
      const date = addDays(todayInIndia(), 10);
      const started = sampleAdminProject({
        status: 'in-development',
        confirmedDeliveryDate: date,
        allowedChanges: [{ to: 'testing', needs: null }],
        timeline: [received, adminStatus('in-development')],
      });
      const { user } = openProject(approved(), {
        [statusUrl]: (init) => {
          sent = jsonBody(init);
          return jsonResponse(200, { project: started });
        },
      });
      const panel = await section('Move this project on');
      await user.selectOptions(panel.getByLabelText('Move to'), 'In Development');
      fireEvent.change(panel.getByLabelText(/^Delivery date/), { target: { value: date } });

      await user.click(panel.getByRole('button', { name: 'Move to In Development' }));

      expect(await screen.findByText('Moved to In Development')).toBeVisible();
      expect(sent).toEqual({ to: 'in-development', confirmedDeliveryDate: date });
      const delivery = await section('Delivery date');
      expect(delivery.getByText(formatCalendarDate(date))).toBeVisible();
    });
  });

  describe('when the move is final', () => {
    it('needs a tick before the button works, since it cannot be undone', async () => {
      let sent: unknown;
      const { user } = openProject(awaitingReview({ customerSignedOff: true }), {
        [statusUrl]: (init) => {
          sent = jsonBody(init);
          return jsonResponse(200, { project: finished('completed') });
        },
      });
      const panel = await section('Move this project on');
      await user.selectOptions(panel.getByLabelText('Move to'), 'Completed');

      const button = panel.getByRole('button', { name: 'Move to Completed' });
      expect(button).toBeDisabled();
      await user.click(
        panel.getByRole('checkbox', { name: /I understand that “Completed” is final/ }),
      );
      expect(button).toBeEnabled();
      await user.click(button);

      expect(await screen.findByText('Moved to Completed')).toBeVisible();
      expect(sent).toEqual({ to: 'completed' });
      // Nothing more can be done: the panel says so.
      expect(
        (await section('Move this project on')).getByText(/status can't be changed any more/),
      ).toBeVisible();
    });

    it('does not ask for a tick for a move that can be undone', async () => {
      const { user } = openProject();
      const panel = await section('Move this project on');
      await user.selectOptions(panel.getByLabelText('Move to'), 'Under Review');
      expect(panel.queryByRole('checkbox')).not.toBeInTheDocument();
      expect(panel.getByRole('button', { name: 'Move to Under Review' })).toBeEnabled();
    });
  });

  describe('when it does not work', () => {
    it('keeps what was typed and says so, if the site is unavailable', async () => {
      const { user } = openProject(sampleAdminProject(), {
        [statusUrl]: () =>
          jsonResponse(503, {
            error: {
              code: 'SERVICE_UNAVAILABLE',
              message: 'This part of the site is temporarily unavailable.',
            },
          }),
      });
      const panel = await section('Move this project on');
      await user.selectOptions(panel.getByLabelText('Move to'), 'Under Review');
      await user.type(panel.getByLabelText('Note for the customer (optional)'), 'Starting today');

      await user.click(panel.getByRole('button', { name: 'Move to Under Review' }));

      expect(await panel.findByRole('alert')).toHaveTextContent("The status wasn't changed");
      expect(panel.getByRole('alert')).toHaveTextContent('temporarily unavailable');
      expect(panel.getByLabelText('Note for the customer (optional)')).toHaveValue(
        'Starting today',
      );
      expect(panel.getByRole('button', { name: 'Move to Under Review' })).toBeEnabled();
      expect(screen.queryByText('Moved to Under Review')).not.toBeInTheDocument();
    });

    it('loads the project again, and says why, when someone else moved it first', async () => {
      let loads = 0;
      const { fetchMock, user } = openProject(sampleAdminProject(), {
        [projectUrl]: () => {
          loads += 1;
          return jsonResponse(200, {
            project: loads === 1 ? sampleAdminProject() : underReview(),
          });
        },
        [statusUrl]: () =>
          jsonResponse(409, {
            error: {
              code: 'CONFLICT',
              message:
                'This project was changed by someone else a moment ago, so nothing was changed. Check how it stands now and try again.',
            },
          }),
      });
      const panel = await section('Move this project on');
      await user.selectOptions(panel.getByLabelText('Move to'), 'Under Review');
      await user.click(panel.getByRole('button', { name: 'Move to Under Review' }));

      expect(await screen.findByText('The project has changed')).toBeVisible();
      expect(screen.getByText(/changed by someone else a moment ago/)).toBeVisible();
      // It now shows the project as it really is, with the moves that are possible from there.
      expect(
        within(screen.getByLabelText('Move to'))
          .getAllByRole('option')
          .map((option) => option.textContent),
      ).toContain('Quote Sent');
      expect(requestedUrls(fetchMock).filter((url) => url === base)).toHaveLength(2);
      expect(screen.queryByText('Moved to Under Review')).not.toBeInTheDocument();
    });
  });
});

describe('the delivery date', () => {
  it('can be confirmed, and then the customer-facing date is shown', async () => {
    let sent: unknown;
    const date = addDays(todayInIndia(), 14);
    const { user } = openProject(sampleAdminProject(), {
      [dateUrl]: (init) => {
        sent = jsonBody(init);
        return jsonResponse(200, { project: sampleAdminProject({ confirmedDeliveryDate: date }) });
      },
    });
    const panel = await section('Delivery date');
    expect(
      panel.getByText(
        'No delivery date has been confirmed. The customer sees none until you set one.',
      ),
    ).toBeVisible();
    fireEvent.change(panel.getByLabelText(/^Confirm a delivery date/), { target: { value: date } });
    await user.type(panel.getByLabelText('Note for the customer (optional)'), 'After the festival');

    await user.click(panel.getByRole('button', { name: 'Confirm date' }));

    expect(await screen.findByText('Delivery date confirmed')).toBeVisible();
    expect(sent).toEqual({ date, note: 'After the festival' });
    expect(
      screen.getByText(`The customer can see ${formatCalendarDate(date)} on their project page.`),
    ).toBeVisible();
    const after = await section('Delivery date');
    expect(after.getByText(formatCalendarDate(date))).toBeVisible();
    expect(after.getByRole('button', { name: 'Change date' })).toBeVisible();
  });

  it('can be changed once it is set', async () => {
    const date = addDays(todayInIndia(), 14);
    const later = addDays(todayInIndia(), 20);
    let sent: unknown;
    const { user } = openProject(sampleAdminProject({ confirmedDeliveryDate: date }), {
      [dateUrl]: (init) => {
        sent = jsonBody(init);
        return jsonResponse(200, { project: sampleAdminProject({ confirmedDeliveryDate: later }) });
      },
    });
    const panel = await section('Delivery date');
    expect(panel.getByText(formatCalendarDate(date))).toBeVisible();
    fireEvent.change(panel.getByLabelText(/^Change the date to/), { target: { value: later } });

    await user.click(panel.getByRole('button', { name: 'Change date' }));

    expect(await screen.findByText('Delivery date changed')).toBeVisible();
    expect(sent).toEqual({ date: later });
  });

  it('refuses a missing or past date without asking the server', async () => {
    const { fetchMock, user } = openProject();
    const panel = await section('Delivery date');

    await user.click(panel.getByRole('button', { name: 'Confirm date' }));
    expect(await panel.findByText('Choose a date from the calendar')).toBeVisible();

    fireEvent.change(panel.getByLabelText(/^Confirm a delivery date/), {
      target: { value: addDays(todayInIndia(), -2) },
    });
    await user.click(panel.getByRole('button', { name: 'Confirm date' }));
    expect(await panel.findByText("Choose a date that hasn't passed")).toBeVisible();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
  });

  it("shows the server's reason beside the date when it is the same one", async () => {
    const date = addDays(todayInIndia(), 14);
    const { user } = openProject(sampleAdminProject({ confirmedDeliveryDate: date }), {
      [dateUrl]: () =>
        jsonResponse(400, {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Please check what you entered.',
            fields: { date: 'That is already the delivery date' },
          },
        }),
    });
    const panel = await section('Delivery date');
    fireEvent.change(panel.getByLabelText(/^Change the date to/), { target: { value: date } });

    await user.click(panel.getByRole('button', { name: 'Change date' }));

    expect(await panel.findByText('That is already the delivery date')).toBeVisible();
  });

  it('cannot be changed once the project is finished', async () => {
    openProject({ ...finished('completed'), confirmedDeliveryDate: '2026-11-05' });
    const panel = await section('Delivery date');
    expect(panel.getByText('5 Nov 2026')).toBeVisible();
    expect(panel.getByText(/can't be changed/)).toBeVisible();
    expect(panel.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('internal notes', () => {
  it('lists the notes newest first, with who wrote them, and says they are private', async () => {
    openProject(
      sampleAdminProject({
        adminNotes: [
          {
            id: 'n1',
            text: 'Called, no answer.',
            byName: 'Prajzo Admin',
            at: '2026-10-23T14:00:00.000Z',
          },
          {
            id: 'n2',
            text: 'Spoke on the phone.',
            byName: 'Meera Joshi',
            at: '2026-10-24T05:00:00.000Z',
          },
        ],
      }),
    );

    const notes = await section('Internal notes');
    expect(notes.getByText('Only admins can see these. The customer never does.')).toBeVisible();
    const items = notes.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(within(items[0]!).getByText('Spoke on the phone.')).toBeVisible();
    expect(within(items[0]!).getByText(/Meera Joshi/)).toBeVisible();
    expect(within(items[1]!).getByText('Called, no answer.')).toBeVisible();
    expect(within(items[1]!).getByText('23 Oct 2026, 7:30 pm')).toBeVisible();
  });

  it('says there are none yet', async () => {
    openProject();
    expect((await section('Internal notes')).getByText('No notes yet.')).toBeVisible();
  });

  it('adds a note, shows it at once, and confirms next to the box without a banner', async () => {
    let sent: unknown;
    const { user } = openProject(sampleAdminProject(), {
      [notesUrl]: (init) => {
        sent = jsonBody(init);
        return jsonResponse(201, {
          project: sampleAdminProject({
            adminNotes: [{ id: 'n1', text: 'Customer prefers calls.', byName: 'Prajzo Admin', at }],
          }),
        });
      },
    });
    const notes = await section('Internal notes');
    await user.type(notes.getByLabelText(/^Add a note/), '  Customer prefers calls.  ');

    await user.click(notes.getByRole('button', { name: 'Add note' }));

    expect(await notes.findByText('Note added.')).toBeVisible();
    expect(sent).toEqual({ text: 'Customer prefers calls.' });
    expect((await section('Internal notes')).getByText('Customer prefers calls.')).toBeVisible();
    expect(notes.getByLabelText(/^Add a note/)).toHaveValue('');
    // No banner at the top of the page for a note.
    expect(screen.queryByText('Moved to Under Review')).not.toBeInTheDocument();
    expect(screen.getAllByRole('status')).toHaveLength(2); // where things stand, and "Note added."
  });

  it('asks for a note before saving', async () => {
    const { fetchMock, user } = openProject();
    const notes = await section('Internal notes');

    await user.click(notes.getByRole('button', { name: 'Add note' }));

    expect(await notes.findByText('Write the note')).toBeVisible();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
  });

  it('keeps what was typed and says so when the note could not be saved', async () => {
    const { user } = openProject(sampleAdminProject(), {
      [notesUrl]: () =>
        jsonResponse(503, {
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'This part of the site is temporarily unavailable.',
          },
        }),
    });
    const notes = await section('Internal notes');
    await user.type(notes.getByLabelText(/^Add a note/), 'Do not lose me');

    await user.click(notes.getByRole('button', { name: 'Add note' }));

    expect(await notes.findByRole('alert')).toHaveTextContent("The note wasn't saved");
    expect(notes.getByLabelText(/^Add a note/)).toHaveValue('Do not lose me');
    expect(notes.queryByText('Note added.')).not.toBeInTheDocument();
  });
});
