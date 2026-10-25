import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ProjectDetail } from '@prajzo/shared';
import { describe, expect, it } from 'vitest';
import {
  catalogueRoutes,
  jsonBody,
  jsonResponse,
  mockApi,
  requestedUrls,
  sampleCustomer,
  sampleProject,
  sampleQuote,
  signedInAs,
} from '../../test/mock-api';
import { currentAddress, renderApp } from '../../test/render-app';

type Routes = Parameters<typeof mockApi>[0];
const reference = 'PRZ-2026-0001';
const projectUrl = `GET /api/v1/project-requests/${reference}`;
const actionsUrl = `POST /api/v1/project-requests/${reference}/actions`;

function openProject(extra: Routes = {}, path = `/account/projects/${reference}`) {
  const fetchMock = mockApi({
    ...catalogueRoutes(),
    ...signedInAs(sampleCustomer),
    [projectUrl]: () => jsonResponse(200, { project: sampleProject() }),
    ...extra,
  });
  const user = userEvent.setup();
  const router = renderApp(path);
  return { fetchMock, user, router };
}

/** The project's page, loaded with exactly this project. */
const openWith = (project: ProjectDetail, extra: Routes = {}) =>
  openProject({ [projectUrl]: () => jsonResponse(200, { project }), ...extra });

const at = '2026-10-24T04:30:00.000Z';
const received = {
  kind: 'status',
  from: null,
  to: 'received',
  by: 'customer',
  note: null,
  at: '2026-10-23T13:30:00.000Z',
} as const;
const status = (
  to: ProjectDetail['status'],
  by: 'customer' | 'admin',
  note: string | null = null,
) => ({ kind: 'status', from: null, to, by, note, at }) as const;

const cancelledProject = sampleProject({
  status: 'cancelled',
  allowedActions: [],
  timeline: [
    received,
    {
      kind: 'status',
      from: 'received',
      to: 'cancelled',
      by: 'customer',
      note: 'Changed my mind',
      at: '2026-10-24T04:30:00.000Z',
    },
  ],
});

const quoteSent = () =>
  sampleProject({
    status: 'quote-sent',
    quote: sampleQuote(),
    allowedActions: ['cancel', 'accept-quote', 'decline-quote'],
    timeline: [received, status('quote-sent', 'admin')],
  });

describe('Project page', () => {
  it('sends a signed-out visitor to sign in, and back here afterwards', async () => {
    mockApi(catalogueRoutes());
    const router = renderApp(`/account/projects/${reference}`);

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
    expect(currentAddress(router)).toBe(`/login?next=%2Faccount%2Fprojects%2F${reference}`);
  });

  it('shows the name, reference number, status and what happens next', async () => {
    openProject();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Website for my studio' }),
    ).toBeVisible();
    expect(screen.getByText(`Project ${reference}`)).toBeVisible();
    expect(screen.getAllByText('Request Received').length).toBeGreaterThan(0);
    expect(screen.getByText("We've received your request.")).toBeVisible();
    expect(screen.getByText(/We'll read it and reply with questions or a quote/)).toBeVisible();
  });

  it('shows everything that was asked for', async () => {
    openProject();
    await screen.findByRole('heading', { level: 1, name: 'Website for my studio' });

    const details = within(screen.getByRole('heading', { name: 'Your request' }).parentElement!);
    const row = (term: string) => details.getByText(term).parentElement!;
    expect(within(row('Type of website')).getByText('Business Websites')).toBeVisible();
    expect(within(row('Package')).getByText('Professional Website')).toBeVisible();
    expect(within(row('About the project')).getByText(/five-page website/)).toBeVisible();
    expect(
      within(row('Features')).getByText('Photo or video gallery, Contact or enquiry form'),
    ).toBeVisible();
    expect(within(row('Services to connect')).getByText('Google Maps')).toBeVisible();
    expect(within(row('Preferred date')).getByText(/1 Dec 2026/)).toBeVisible();
    expect(within(row('Preferred date')).getByText('(a wish, not a promise)')).toBeVisible();
    expect(within(row('How to contact you')).getByText('WhatsApp · +91 98866 07720')).toBeVisible();
    expect(within(row('Notes')).getByText('Please message after 5 pm.')).toBeVisible();
  });

  it('says plainly what was not chosen', async () => {
    openWith(
      sampleProject({
        packageKey: null,
        packageName: null,
        features: [],
        integrations: [],
        preferredDate: null,
        phone: null,
        contactPreference: 'email',
        notes: null,
      }),
    );
    await screen.findByRole('heading', { level: 1, name: 'Website for my studio' });

    expect(screen.getByText('Not chosen yet')).toBeVisible();
    expect(screen.getAllByText('None chosen')).toHaveLength(2);
    expect(screen.getByText('No date given')).toBeVisible();
    const details = within(screen.getByRole('heading', { name: 'Your request' }).parentElement!);
    expect(
      within(details.getByText('How to contact you').parentElement!).getByText('Email'),
    ).toBeVisible();
    expect(details.queryByText('Notes')).not.toBeInTheDocument();
  });

  it('shows the timeline: each step, who did it, and when (India time)', async () => {
    openWith(cancelledProject);
    await screen.findByRole('heading', { level: 1, name: 'Website for my studio' });

    const timeline = within(screen.getByRole('heading', { name: 'Timeline' }).parentElement!);
    const steps = timeline.getAllByRole('listitem');
    expect(steps).toHaveLength(2);
    expect(within(steps[0]!).getByText('Request Received')).toBeVisible();
    expect(within(steps[0]!).getByText(/You/)).toBeVisible();
    expect(within(steps[0]!).getByText('23 Oct 2026, 7:00 pm')).toBeVisible();
    expect(within(steps[1]!).getByText('Cancelled')).toBeVisible();
    expect(within(steps[1]!).getByText('24 Oct 2026, 10:00 am')).toBeVisible();
    expect(within(steps[1]!).getByText('“Changed my mind”')).toBeVisible();
  });

  it("shows every kind of entry in the timeline, from the customer's point of view", async () => {
    openWith(
      sampleProject({
        status: 'awaiting-review',
        allowedActions: [],
        timeline: [
          received,
          status('under-review', 'admin', 'Starting the review today.'),
          { kind: 'reply', by: 'customer', text: 'Logo attached.', at },
          {
            kind: 'delivery-date',
            by: 'admin',
            from: null,
            to: '2026-11-05',
            note: 'Festival week',
            at,
          },
          {
            kind: 'delivery-date',
            by: 'admin',
            from: '2026-11-05',
            to: '2026-11-08',
            note: null,
            at,
          },
          { kind: 'sign-off', by: 'customer', at },
        ],
      }),
    );
    await screen.findByRole('heading', { level: 1, name: 'Website for my studio' });

    const timeline = within(screen.getByRole('heading', { name: 'Timeline' }).parentElement!);
    expect(timeline.getByText('Under Review')).toBeVisible();
    // Three of the entries are Prajzo's: the review, and the two delivery dates.
    expect(timeline.getAllByText(/^Prajzo ·/)).toHaveLength(3);
    expect(timeline.getAllByText(/^You ·/)).toHaveLength(3);
    expect(timeline.getAllByText(/24 Oct 2026, 10:00 am/).length).toBeGreaterThan(0);
    expect(timeline.getByText('“Starting the review today.”')).toBeVisible();
    expect(timeline.getByText("You answered Prajzo's question")).toBeVisible();
    expect(timeline.getByText('“Logo attached.”')).toBeVisible();
    expect(timeline.getByText('Delivery date confirmed: 5 Nov 2026')).toBeVisible();
    expect(timeline.getByText('“Festival week”')).toBeVisible();
    expect(timeline.getByText('Delivery date changed to 8 Nov 2026')).toBeVisible();
    expect(timeline.getByText('“It was 5 Nov 2026.”')).toBeVisible();
    expect(timeline.getByText('You said the project looks good')).toBeVisible();
  });

  it('shows how to get in touch, quoting the reference', async () => {
    openProject();
    await screen.findByRole('heading', { level: 1, name: 'Website for my studio' });

    const help = within(
      screen.getByRole('heading', { name: 'Questions about this project?' }).parentElement!,
    );
    expect(help.getByText(reference)).toBeVisible();
    expect(help.getByRole('link', { name: /WhatsApp/ })).toBeVisible();
  });

  it('asks search engines not to list it', async () => {
    openProject();
    await screen.findByRole('heading', { level: 1, name: 'Website for my studio' });
    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
  });

  describe('when it cannot be found or loaded', () => {
    it('says it could not be found when the server says 404', async () => {
      openProject({
        [projectUrl]: () =>
          jsonResponse(404, {
            error: { code: 'NOT_FOUND', message: "We couldn't find that project." },
          }),
      });

      expect(
        await screen.findByRole('heading', { level: 1, name: "We couldn't find that project" }),
      ).toBeVisible();
      expect(screen.getByRole('link', { name: 'See my projects' })).toHaveAttribute(
        'href',
        '/account/projects',
      );
    });

    it('says so, and tries again on request, when the server is unavailable', async () => {
      let calls = 0;
      const { user } = openProject({
        [projectUrl]: () => {
          calls += 1;
          return calls === 1
            ? jsonResponse(503, {
                error: {
                  code: 'SERVICE_UNAVAILABLE',
                  message: 'This part of the site is temporarily unavailable.',
                },
              })
            : jsonResponse(200, { project: sampleProject() });
        },
      });

      expect(await screen.findByRole('alert')).toHaveTextContent('temporarily unavailable');
      await user.click(screen.getByRole('button', { name: 'Try again' }));
      expect(
        await screen.findByRole('heading', { level: 1, name: 'Website for my studio' }),
      ).toBeVisible();
    });
  });
});

describe('the delivery date and the revisions', () => {
  it('shows the confirmed delivery date, and says who confirmed it', async () => {
    openWith(
      sampleProject({
        status: 'in-development',
        allowedActions: [],
        confirmedDeliveryDate: '2026-11-05',
      }),
    );
    await screen.findByRole('heading', { level: 1, name: 'Website for my studio' });

    expect(screen.getByText('Delivery date:')).toBeVisible();
    expect(screen.getAllByText(/5 Nov 2026/).length).toBeGreaterThan(0);
    expect(screen.getByText('(confirmed by Prajzo)')).toBeVisible();
  });

  it('shows no delivery date before one is confirmed, rather than a made-up one', async () => {
    openProject();
    await screen.findByRole('heading', { level: 1, name: 'Website for my studio' });
    expect(screen.queryByText('Delivery date:')).not.toBeInTheDocument();
  });

  it('shows how many rounds of changes have been used', async () => {
    openWith(
      sampleProject({
        status: 'in-development',
        allowedActions: [],
        revisions: { included: 2, used: 1 },
        quote: sampleQuote({ accepted: true }),
      }),
    );
    await screen.findByRole('heading', { level: 1, name: 'Website for my studio' });

    expect(screen.getByText('Rounds of changes used:')).toBeVisible();
    expect(screen.getByText('1 of 2 included')).toBeVisible();
  });
});

describe('the quote', () => {
  it('shows the price, what it includes, and the rounds of changes included', async () => {
    openWith(quoteSent());

    expect(await screen.findByRole('heading', { name: 'Your quote' })).toBeVisible();
    expect(screen.getByText('₹15,000')).toBeVisible();
    expect(screen.getByText(/A five-page website with a photo gallery/)).toBeVisible();
    expect(screen.getByText('Rounds of changes included:')).toBeVisible();
    expect(screen.getByText('Quote 1 · sent 24 Oct 2026', { exact: false })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Accept this quote' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Decline this quote' })).toBeVisible();
  });

  it('shows no quote, and no buttons, when there is none to answer', async () => {
    openProject();
    await screen.findByRole('heading', { level: 1, name: 'Website for my studio' });
    expect(screen.queryByRole('heading', { name: /Your .*quote/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /quote/i })).not.toBeInTheDocument();
  });

  it('asks first, links to the Terms, and does nothing if they say "not yet"', async () => {
    const { fetchMock, user } = openWith(quoteSent());
    await user.click(await screen.findByRole('button', { name: 'Accept this quote' }));

    expect(screen.getByText('Accept this quote?')).toBeVisible();
    expect(
      within(screen.getByRole('main')).getByRole('link', { name: 'Terms and Conditions' }),
    ).toHaveAttribute('href', '/terms');
    await user.click(screen.getByRole('button', { name: 'Not yet' }));

    expect(screen.queryByText('Accept this quote?')).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
  });

  it('accepts the quote they were looking at, then shows it as accepted with no buttons', async () => {
    let sent: unknown;
    const accepted = sampleProject({
      status: 'approved',
      allowedActions: [],
      quote: sampleQuote({ accepted: true }),
      revisions: { included: 2, used: 0 },
      timeline: [received, status('quote-sent', 'admin'), status('approved', 'customer')],
    });
    const { user } = openWith(quoteSent(), {
      [actionsUrl]: (init) => {
        sent = jsonBody(init);
        return jsonResponse(200, { project: accepted });
      },
    });
    await user.click(await screen.findByRole('button', { name: 'Accept this quote' }));

    await user.click(screen.getByRole('button', { name: 'Yes, accept the quote' }));

    expect(await screen.findByText('You accepted the quote')).toBeVisible();
    expect(sent).toEqual({ action: 'accept-quote', quoteVersion: 1 });
    expect(screen.getByRole('heading', { name: 'Your accepted quote' })).toBeVisible();
    expect(screen.getByText('Accepted')).toBeVisible();
    expect(screen.queryByRole('button', { name: /accept|decline/i })).not.toBeInTheDocument();
    expect(screen.getByRole('status').parentElement).toHaveFocus();
  });

  it('declines the quote, with a reason, and shows the project as cancelled', async () => {
    let sent: unknown;
    const { user } = openWith(quoteSent(), {
      [actionsUrl]: (init) => {
        sent = jsonBody(init);
        return jsonResponse(200, {
          project: sampleProject({
            status: 'cancelled',
            allowedActions: [],
            quote: null,
            timeline: [
              received,
              status('quote-sent', 'admin'),
              status('cancelled', 'customer', 'Quote declined: Too expensive'),
            ],
          }),
        });
      },
    });
    await user.click(await screen.findByRole('button', { name: 'Decline this quote' }));
    await user.type(screen.getByLabelText('Reason (optional)'), '  Too expensive  ');

    await user.click(screen.getByRole('button', { name: 'Yes, decline and cancel' }));

    expect(await screen.findByText('You declined the quote')).toBeVisible();
    expect(sent).toEqual({ action: 'decline-quote', quoteVersion: 1, note: 'Too expensive' });
    expect(screen.getByText('This project was cancelled.')).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Your quote' })).not.toBeInTheDocument();
  });

  it("shows the server's words, and the new quote, when the quote changed while it was open", async () => {
    let loads = 0;
    const { fetchMock, user } = openProject({
      [projectUrl]: () => {
        loads += 1;
        return jsonResponse(200, {
          project:
            loads === 1
              ? quoteSent()
              : sampleProject({
                  ...quoteSent(),
                  quote: sampleQuote({ version: 2, amountPaise: 1_200_000 }),
                }),
        });
      },
      [actionsUrl]: () =>
        jsonResponse(409, {
          error: {
            code: 'CONFLICT',
            message: 'This quote has changed since you opened it. Please read the new quote.',
          },
        }),
    });
    await user.click(await screen.findByRole('button', { name: 'Accept this quote' }));
    await user.click(screen.getByRole('button', { name: 'Yes, accept the quote' }));

    // The page loads the project again, shows the new quote, and says why the click did nothing.
    expect(await screen.findByText('₹12,000')).toBeVisible();
    expect(screen.getByText('The project has changed')).toBeVisible();
    expect(
      screen.getByText('This quote has changed since you opened it. Please read the new quote.'),
    ).toBeVisible();
    expect(screen.getByRole('status').parentElement).toHaveFocus();
    expect(screen.getByText('Quote 2 · sent 24 Oct 2026', { exact: false })).toBeVisible();
    expect(requestedUrls(fetchMock).filter((url) => url.endsWith(reference))).toHaveLength(2);
    expect(screen.queryByText('You accepted the quote')).not.toBeInTheDocument();
  });

  it('keeps the question open and says so when the site is down', async () => {
    const { user } = openWith(quoteSent(), {
      [actionsUrl]: () =>
        jsonResponse(503, {
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'This part of the site is temporarily unavailable.',
          },
        }),
    });
    await user.click(await screen.findByRole('button', { name: 'Accept this quote' }));
    await user.click(screen.getByRole('button', { name: 'Yes, accept the quote' }));

    expect(await screen.findByRole('alert')).toHaveTextContent("The quote wasn't accepted");
    expect(screen.getByRole('button', { name: 'Yes, accept the quote' })).toBeEnabled();
    expect(screen.queryByText('You accepted the quote')).not.toBeInTheDocument();
  });
});

describe("answering Prajzo's question", () => {
  const asking = () =>
    sampleProject({
      status: 'awaiting-information',
      allowedActions: ['cancel', 'reply'],
      timeline: [
        received,
        status('awaiting-information', 'admin', 'Please send your logo and brand colours.'),
      ],
    });

  it('shows the question, and a box for the answer', async () => {
    openWith(asking());

    expect(
      await screen.findByRole('heading', { name: 'Prajzo needs something from you' }),
    ).toBeVisible();
    expect(
      screen.getByText('Please send your logo and brand colours.', { selector: 'p' }),
    ).toBeVisible();
    expect(screen.getByLabelText(/^Your answer/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Send answer' })).toBeVisible();
  });

  it('sends the answer, shows it in the list, and empties the box', async () => {
    let sent: unknown;
    const answered = sampleProject({
      ...asking(),
      timeline: [
        ...asking().timeline,
        {
          kind: 'reply',
          by: 'customer',
          text: 'Logo sent on WhatsApp. Blue and white.',
          at: '2026-10-24T05:00:00.000Z',
        },
      ],
    });
    const { user } = openWith(asking(), {
      [actionsUrl]: (init) => {
        sent = jsonBody(init);
        return jsonResponse(200, { project: answered });
      },
    });
    await user.type(
      await screen.findByLabelText(/^Your answer/),
      'Logo sent on WhatsApp. Blue and white.',
    );

    await user.click(screen.getByRole('button', { name: 'Send answer' }));

    expect(await screen.findByText('Your answer was sent')).toBeVisible();
    expect(sent).toEqual({ action: 'reply', message: 'Logo sent on WhatsApp. Blue and white.' });
    expect(screen.getByText('Your answers so far')).toBeVisible();
    expect(screen.getAllByText('Logo sent on WhatsApp. Blue and white.').length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/^Add something more/)).toHaveValue('');
  });

  it('asks for a real answer before sending anything', async () => {
    const { fetchMock, user } = openWith(asking());
    await screen.findByLabelText(/^Your answer/);

    await user.click(screen.getByRole('button', { name: 'Send answer' }));

    expect(await screen.findByText('Write your answer')).toBeVisible();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
  });

  it('says so, and keeps what was typed, when the answer could not be sent', async () => {
    const { user } = openWith(asking(), {
      [actionsUrl]: () =>
        jsonResponse(503, {
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'This part of the site is temporarily unavailable.',
          },
        }),
    });
    await user.type(await screen.findByLabelText(/^Your answer/), 'Here is my answer');

    await user.click(screen.getByRole('button', { name: 'Send answer' }));

    expect(await screen.findByRole('alert')).toHaveTextContent("Your answer wasn't sent");
    expect(screen.getByLabelText(/^Your answer/)).toHaveValue('Here is my answer');
  });

  it('shows no box when the server does not allow an answer', async () => {
    openWith(sampleProject({ ...asking(), allowedActions: ['cancel'] }));
    await screen.findByRole('heading', { name: 'Prajzo needs something from you' });
    expect(screen.queryByLabelText(/Your answer/)).not.toBeInTheDocument();
  });

  it('is not shown at all in other statuses', async () => {
    openProject();
    await screen.findByRole('heading', { level: 1, name: 'Website for my studio' });
    expect(
      screen.queryByRole('heading', { name: 'Prajzo needs something from you' }),
    ).not.toBeInTheDocument();
  });
});

describe('reviewing the finished project', () => {
  const ready = (overrides: Partial<ProjectDetail> = {}) =>
    sampleProject({
      status: 'awaiting-review',
      allowedActions: ['request-revision', 'sign-off'],
      revisions: { included: 2, used: 1 },
      quote: sampleQuote({ accepted: true }),
      timeline: [
        received,
        status('awaiting-review', 'admin', 'Preview: https://preview.example.com'),
      ],
      ...overrides,
    });

  it('shows the note from Prajzo, the rounds of changes used, and the two choices', async () => {
    openWith(ready());

    expect(
      await screen.findByRole('heading', { name: 'Your project is ready for you to review' }),
    ).toBeVisible();
    expect(
      screen.getByText('Preview: https://preview.example.com', { selector: 'p' }),
    ).toBeVisible();
    expect(screen.getByText('1 of 2')).toBeVisible();
    expect(screen.getByRole('button', { name: 'It looks good' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Ask for changes' })).toBeVisible();
    expect(screen.queryByText(/quoted separately/)).not.toBeInTheDocument();
  });

  it('says that more changes may cost something, once the included ones are used up', async () => {
    openWith(ready({ revisions: { included: 2, used: 2 } }));
    expect(await screen.findByText(/Further changes may be quoted separately/)).toBeVisible();
  });

  it('tells Prajzo it looks good, without pretending the project is complete', async () => {
    let sent: unknown;
    const signed = ready({
      allowedActions: ['request-revision'],
      timeline: [
        received,
        status('awaiting-review', 'admin'),
        { kind: 'sign-off', by: 'customer', at: '2026-10-24T05:30:00.000Z' },
      ],
    });
    const { user } = openWith(ready(), {
      [actionsUrl]: (init) => {
        sent = jsonBody(init);
        return jsonResponse(200, { project: signed });
      },
    });

    await user.click(await screen.findByRole('button', { name: 'It looks good' }));

    expect(await screen.findByText('Thank you')).toBeVisible();
    expect(sent).toEqual({ action: 'sign-off' });
    expect(screen.getByText('You told us it looks good')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'It looks good' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ask for changes' })).toBeVisible();
    expect(screen.getAllByText('Awaiting Customer Review').length).toBeGreaterThan(0); // still not complete
  });

  it('asks for changes, which must say what to change', async () => {
    let sent: unknown;
    const changed = sampleProject({
      status: 'revision-requested',
      allowedActions: [],
      revisions: { included: 2, used: 2 },
      timeline: [
        received,
        status('revision-requested', 'customer', 'Please make the logo a little bigger.'),
      ],
    });
    const { fetchMock, user } = openWith(ready(), {
      [actionsUrl]: (init) => {
        sent = jsonBody(init);
        return jsonResponse(200, { project: changed });
      },
    });
    await user.click(await screen.findByRole('button', { name: 'Ask for changes' }));

    await user.click(screen.getByRole('button', { name: 'Send change request' }));
    expect(
      await screen.findByText("Tell us what you'd like changed (at least 5 characters)"),
    ).toBeVisible();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);

    await user.type(
      screen.getByLabelText(/^What would you like changed/),
      'Please make the logo a little bigger.',
    );
    await user.click(screen.getByRole('button', { name: 'Send change request' }));

    expect(await screen.findByText('Your request for changes was sent')).toBeVisible();
    expect(sent).toEqual({
      action: 'request-revision',
      message: 'Please make the logo a little bigger.',
    });
    expect(
      screen.queryByRole('heading', { name: 'Your project is ready for you to review' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("You've asked for changes.")).toBeVisible();
  });

  it('is not shown before the project is ready', async () => {
    openProject();
    await screen.findByRole('heading', { level: 1, name: 'Website for my studio' });
    expect(screen.queryByRole('button', { name: 'It looks good' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ask for changes' })).not.toBeInTheDocument();
  });
});

describe('Cancelling a project', () => {
  it('is offered only when the server says it is allowed', async () => {
    openWith(sampleProject({ status: 'in-development', allowedActions: [] }));
    await screen.findByRole('heading', { level: 1, name: 'Website for my studio' });

    expect(screen.queryByRole('button', { name: 'Cancel this project' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Cancel this project' })).not.toBeInTheDocument();
  });

  it('asks first, and does nothing if they keep the project', async () => {
    const { fetchMock, user } = openProject();
    await user.click(await screen.findByRole('button', { name: 'Cancel this project' }));

    expect(screen.getByText('Are you sure you want to cancel this project?')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Keep my project' }));

    expect(
      screen.queryByText('Are you sure you want to cancel this project?'),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel this project' })).toBeVisible();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
  });

  it('cancels with a reason, then shows the new status and takes the buttons away', async () => {
    let sent: unknown;
    const { user } = openProject({
      [actionsUrl]: (init) => {
        sent = jsonBody(init);
        return jsonResponse(200, { project: cancelledProject });
      },
    });
    await user.click(await screen.findByRole('button', { name: 'Cancel this project' }));
    await user.type(screen.getByLabelText('Reason (optional)'), '  Changed my mind  ');

    await user.click(screen.getByRole('button', { name: 'Yes, cancel this project' }));

    expect(await screen.findByText('Your project has been cancelled')).toBeVisible();
    expect(sent).toEqual({ action: 'cancel', note: 'Changed my mind' });
    expect(screen.getByText('This project was cancelled.')).toBeVisible();
    expect(screen.getAllByText('Cancelled').length).toBeGreaterThan(0);
    expect(screen.getByText('“Changed my mind”')).toBeVisible();
    expect(screen.queryByRole('button', { name: /cancel this project/i })).not.toBeInTheDocument();
    // Focus moves to the confirmation, so keyboard and screen-reader users aren't left stranded.
    expect(screen.getByRole('status').parentElement).toHaveFocus();
  });

  it('sends no reason when none was given', async () => {
    let sent: unknown;
    const { user } = openProject({
      [actionsUrl]: (init) => {
        sent = jsonBody(init);
        return jsonResponse(200, { project: cancelledProject });
      },
    });
    await user.click(await screen.findByRole('button', { name: 'Cancel this project' }));
    await user.click(screen.getByRole('button', { name: 'Yes, cancel this project' }));

    await screen.findByText('Your project has been cancelled');
    expect(sent).toEqual({ action: 'cancel' });
  });

  it("shows the server's reason when it can't be cancelled, and loads the latest state", async () => {
    let loads = 0;
    const { fetchMock, user } = openProject({
      [projectUrl]: () => {
        loads += 1;
        return jsonResponse(200, {
          project:
            loads === 1
              ? sampleProject()
              : sampleProject({ status: 'under-review', allowedActions: [] }),
        });
      },
      [actionsUrl]: () =>
        jsonResponse(409, {
          error: {
            code: 'CONFLICT',
            message: "This project can't be cancelled at its current stage. Please contact us.",
          },
        }),
    });
    await user.click(await screen.findByRole('button', { name: 'Cancel this project' }));
    await user.click(screen.getByRole('button', { name: 'Yes, cancel this project' }));

    // The page loads the project again and now shows it as it really is: under review,
    // with the server's reason for refusing.
    expect(await screen.findByText("We're reviewing your request.")).toBeVisible();
    expect(
      screen.getByText("This project can't be cancelled at its current stage. Please contact us."),
    ).toBeVisible();
    expect(
      requestedUrls(fetchMock).filter((url) => url === `/api/v1/project-requests/${reference}`),
    ).toHaveLength(2);
    expect(screen.queryByText('Your project has been cancelled')).not.toBeInTheDocument();
  });

  it('keeps the question open and says so when the site is down', async () => {
    const { user } = openProject({
      [actionsUrl]: () =>
        jsonResponse(503, {
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'This part of the site is temporarily unavailable.',
          },
        }),
    });
    await user.click(await screen.findByRole('button', { name: 'Cancel this project' }));
    await user.type(screen.getByLabelText('Reason (optional)'), 'Too expensive');

    await user.click(screen.getByRole('button', { name: 'Yes, cancel this project' }));

    expect(await screen.findByRole('alert')).toHaveTextContent("The project wasn't cancelled");
    expect(screen.getByLabelText('Reason (optional)')).toHaveValue('Too expensive');
    expect(screen.queryByText('Your project has been cancelled')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Yes, cancel this project' })).toBeEnabled();
  });
});
