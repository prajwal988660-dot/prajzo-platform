import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  catalogueRoutes,
  jsonBody,
  jsonResponse,
  mockApi,
  requestedUrls,
  sampleCustomer,
  sampleProject,
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

const cancelledProject = sampleProject({
  status: 'cancelled',
  allowedActions: [],
  history: [
    { from: null, to: 'received', by: 'customer', note: null, at: '2026-10-23T13:30:00.000Z' },
    {
      from: 'received',
      to: 'cancelled',
      by: 'customer',
      note: 'Changed my mind',
      at: '2026-10-24T04:30:00.000Z',
    },
  ],
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
    openProject({
      [projectUrl]: () =>
        jsonResponse(200, {
          project: sampleProject({
            packageKey: null,
            packageName: null,
            features: [],
            integrations: [],
            preferredDate: null,
            phone: null,
            contactPreference: 'email',
            notes: null,
          }),
        }),
    });
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
    openProject({
      [projectUrl]: () => jsonResponse(200, { project: cancelledProject }),
    });
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

  it('shows who made each change: "Prajzo" for a team member', async () => {
    openProject({
      [projectUrl]: () =>
        jsonResponse(200, {
          project: sampleProject({
            status: 'under-review',
            allowedActions: [],
            history: [
              {
                from: null,
                to: 'received',
                by: 'customer',
                note: null,
                at: '2026-10-23T13:30:00.000Z',
              },
              {
                from: 'received',
                to: 'under-review',
                by: 'admin',
                note: null,
                at: '2026-10-23T14:30:00.000Z',
              },
            ],
          }),
        }),
    });
    await screen.findByRole('heading', { level: 1, name: 'Website for my studio' });

    const steps = within(
      screen.getByRole('heading', { name: 'Timeline' }).parentElement!,
    ).getAllByRole('listitem');
    expect(within(steps[1]!).getByText(/Prajzo/)).toBeVisible();
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
        await screen.findByRole('heading', { name: "We couldn't find that project" }),
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

describe('Cancelling a project', () => {
  it('is offered only when the server says it is allowed', async () => {
    openProject({
      [projectUrl]: () =>
        jsonResponse(200, {
          project: sampleProject({ status: 'in-development', allowedActions: [] }),
        }),
    });
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

    // The page loads the project again and now shows it as it really is: under review.
    expect(await screen.findByText("We're reviewing your request.")).toBeVisible();
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
