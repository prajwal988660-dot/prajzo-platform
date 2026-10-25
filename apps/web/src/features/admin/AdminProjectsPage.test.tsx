import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  catalogueRoutes,
  jsonResponse,
  mockApi,
  pageOf,
  requestedUrls,
  sampleAdmin,
  sampleAdminProjectSummary,
  signedInAs,
} from '../../test/mock-api';
import { currentAddress, renderApp } from '../../test/render-app';

const open20 = '/api/v1/admin/project-requests?status=open&page=1&limit=20';

function openList(
  items = [sampleAdminProjectSummary()],
  extraRoutes: Parameters<typeof mockApi>[0] = {},
  path = '/admin/projects',
  total = items.length,
) {
  const fetchMock = mockApi({
    ...catalogueRoutes(),
    ...signedInAs(sampleAdmin),
    [`GET ${open20}`]: () => jsonResponse(200, pageOf(items, total)),
    ...extraRoutes,
  });
  const user = userEvent.setup();
  const router = renderApp(path);
  return { fetchMock, user, router };
}

describe('the admin projects list', () => {
  it('shows each project with its customer, reference, status and a link to open it', async () => {
    openList([
      sampleAdminProjectSummary({
        reference: 'PRZ-2026-0007',
        title: 'Sweet shop website',
        customerName: 'Ravi Kumar',
        customerEmail: 'ravi@example.com',
        categoryTitle: 'Business Websites',
        createdAt: '2026-10-20T05:00:00.000Z',
        status: 'received',
      }),
    ]);

    const list = within(await screen.findByRole('list', { name: 'Projects' }));
    const link = list.getByRole('link', { name: /Sweet shop website/ });
    expect(link).toHaveAttribute('href', '/admin/projects/PRZ-2026-0007');
    expect(within(link).getByText('PRZ-2026-0007')).toBeVisible();
    expect(within(link).getByText(/Business Websites/)).toBeVisible();
    expect(within(link).getByText(/20 Oct 2026/)).toBeVisible();
    expect(within(link).getByText(/Ravi Kumar · ravi@example.com/)).toBeVisible();
    expect(within(link).getByText('Request Received')).toBeVisible();
  });

  it('shows who has to act next, and flags a customer reply or a sign-off', async () => {
    openList([
      sampleAdminProjectSummary({
        reference: 'PRZ-2026-0001',
        title: 'New one',
        waitingOn: 'prajzo',
      }),
      sampleAdminProjectSummary({
        reference: 'PRZ-2026-0002',
        title: 'Asked a question',
        status: 'awaiting-information',
        waitingOn: 'customer',
      }),
      sampleAdminProjectSummary({
        reference: 'PRZ-2026-0003',
        title: 'Customer answered',
        status: 'awaiting-information',
        waitingOn: 'prajzo',
        customerReplied: true,
      }),
      sampleAdminProjectSummary({
        reference: 'PRZ-2026-0004',
        title: 'Customer is happy',
        status: 'awaiting-review',
        waitingOn: 'prajzo',
        customerSignedOff: true,
      }),
      sampleAdminProjectSummary({
        reference: 'PRZ-2026-0005',
        title: 'Finished',
        status: 'completed',
        waitingOn: null,
      }),
    ]);

    const rows = within(await screen.findByRole('list', { name: 'Projects' })).getAllByRole(
      'listitem',
    );
    expect(within(rows[0]!).getByText('Needs you')).toBeVisible();
    expect(within(rows[1]!).getByText('Waiting for customer')).toBeVisible();
    expect(within(rows[1]!).queryByText('Needs you')).not.toBeInTheDocument();
    expect(within(rows[2]!).getByText('Customer replied')).toBeVisible();
    expect(within(rows[2]!).getByText('Needs you')).toBeVisible();
    expect(within(rows[3]!).getByText('Said it looks good')).toBeVisible();
    expect(within(rows[4]!).queryByText('Needs you')).not.toBeInTheDocument();
    expect(within(rows[4]!).queryByText('Waiting for customer')).not.toBeInTheDocument();
  });

  it('counts the projects, in the singular for one', async () => {
    const { fetchMock } = openList();
    expect(await screen.findByText('1 project')).toBeVisible();
    expect(requestedUrls(fetchMock)).toContain(open20);
  });

  it('shows open projects first by default, and says what the filter is', async () => {
    openList();
    await screen.findByRole('list', { name: 'Projects' });
    expect(screen.getByLabelText('Show')).toHaveValue('open');
    expect(screen.getByLabelText('Search')).toHaveValue('');
  });

  it('offers every status as a filter, and loads that status when one is chosen', async () => {
    const quoteSent = '/api/v1/admin/project-requests?status=quote-sent&page=1&limit=20';
    const { fetchMock, user, router } = openList([sampleAdminProjectSummary()], {
      [`GET ${quoteSent}`]: () =>
        jsonResponse(
          200,
          pageOf([
            sampleAdminProjectSummary({ title: 'Waiting on a quote', status: 'quote-sent' }),
          ]),
        ),
    });
    await screen.findByRole('list', { name: 'Projects' });
    const options = within(screen.getByLabelText('Show'))
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(options).toHaveLength(13); // open, all, and the eleven statuses
    expect(options.slice(0, 3)).toEqual(['Open projects', 'All projects', 'Request Received']);

    await user.selectOptions(screen.getByLabelText('Show'), 'Quote Sent');

    expect(await screen.findByRole('link', { name: /Waiting on a quote/ })).toBeVisible();
    expect(requestedUrls(fetchMock)).toContain(quoteSent);
    expect(currentAddress(router)).toBe('/admin/projects?status=quote-sent');
    expect(screen.getByLabelText('Show')).toHaveValue('quote-sent');
  });

  it('searches by what was typed, keeping the status that was chosen', async () => {
    const found = '/api/v1/admin/project-requests?status=all&page=1&limit=20&q=Ravi';
    const fetchMock = mockApi({
      ...catalogueRoutes(),
      ...signedInAs(sampleAdmin),
      'GET /api/v1/admin/project-requests?status=all&page=1&limit=20': () =>
        jsonResponse(200, pageOf([sampleAdminProjectSummary({ title: 'Anything' })])),
      [`GET ${found}`]: () =>
        jsonResponse(200, pageOf([sampleAdminProjectSummary({ title: 'Ravi sweets' })])),
    });
    const user = userEvent.setup();
    const router = renderApp('/admin/projects?status=all');
    await screen.findByRole('link', { name: /Anything/ });

    await user.type(screen.getByLabelText('Search'), '  Ravi  ');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByRole('link', { name: /Ravi sweets/ })).toBeVisible();
    expect(requestedUrls(fetchMock)).toContain(found);
    expect(currentAddress(router)).toBe('/admin/projects?status=all&q=Ravi');
    expect(screen.getByText(/matching/)).toHaveTextContent('1 project matching “Ravi”');
  });

  it('keeps the same filter and search boxes (and so the keyboard focus) when they are used', async () => {
    const quoteSent = '/api/v1/admin/project-requests?status=quote-sent&page=1&limit=20&q=Ravi';
    const { user } = openList([sampleAdminProjectSummary()], {
      'GET /api/v1/admin/project-requests?status=quote-sent&page=1&limit=20': () =>
        jsonResponse(200, pageOf([sampleAdminProjectSummary({ title: 'Quoted' })])),
      [`GET ${quoteSent}`]: () =>
        jsonResponse(200, pageOf([sampleAdminProjectSummary({ title: 'Quoted for Ravi' })])),
    });
    await screen.findByRole('list', { name: 'Projects' });
    const select = screen.getByLabelText('Show');
    const box = screen.getByLabelText('Search');

    await user.selectOptions(select, 'Quote Sent');
    await screen.findByRole('link', { name: /Quoted/ });
    expect(screen.getByLabelText('Show')).toBe(select);
    expect(select).toHaveValue('quote-sent');

    await user.type(box, 'Ravi');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await screen.findByRole('link', { name: /Quoted for Ravi/ });
    expect(screen.getByLabelText('Search')).toBe(box);
    expect(screen.getByLabelText('Show')).toBe(select);
  });

  it('applies what is typed when the filter is changed, and follows the back button', async () => {
    const both = '/api/v1/admin/project-requests?status=completed&page=1&limit=20&q=Ravi';
    const { user, router } = openList([sampleAdminProjectSummary()], {
      [`GET ${both}`]: () =>
        jsonResponse(200, pageOf([sampleAdminProjectSummary({ title: 'Done for Ravi' })])),
    });
    await screen.findByRole('list', { name: 'Projects' });
    await user.type(screen.getByLabelText('Search'), 'Ravi');

    await user.selectOptions(screen.getByLabelText('Show'), 'Completed');

    expect(await screen.findByRole('link', { name: /Done for Ravi/ })).toBeVisible();
    expect(currentAddress(router)).toBe('/admin/projects?status=completed&q=Ravi');

    await act(() => router.navigate(-1));

    expect(await screen.findByRole('list', { name: 'Projects' })).toBeVisible();
    expect(screen.getByLabelText('Search')).toHaveValue('');
    expect(screen.getByLabelText('Show')).toHaveValue('open');
  });

  it('reads the filter, search and page from the address, and fills the fields in', async () => {
    const path = '/api/v1/admin/project-requests?status=completed&page=2&limit=20&q=studio';
    const { fetchMock } = openList(
      [],
      {
        [`GET ${path}`]: () =>
          jsonResponse(
            200,
            pageOf([sampleAdminProjectSummary({ title: 'Studio, page two' })], 45, 2),
          ),
      },
      '/admin/projects?status=completed&q=studio&page=2',
    );

    expect(await screen.findByRole('link', { name: /Studio, page two/ })).toBeVisible();
    expect(requestedUrls(fetchMock)).toContain(path);
    expect(screen.getByLabelText('Show')).toHaveValue('completed');
    expect(screen.getByLabelText('Search')).toHaveValue('studio');
  });

  it('pages through the results, keeping the filter and the search', async () => {
    openList(
      [],
      {
        'GET /api/v1/admin/project-requests?status=completed&page=2&limit=20&q=studio': () =>
          jsonResponse(200, pageOf([sampleAdminProjectSummary()], 45, 2)),
      },
      '/admin/projects?status=completed&q=studio&page=2',
    );

    const pages = within(await screen.findByRole('navigation', { name: 'Pages of projects' }));
    expect(pages.getByText('Page 2 of 3')).toBeVisible();
    expect(pages.getByRole('link', { name: 'Previous' })).toHaveAttribute(
      'href',
      '/admin/projects?status=completed&q=studio&page=1',
    );
    expect(pages.getByRole('link', { name: 'Next' })).toHaveAttribute(
      'href',
      '/admin/projects?status=completed&q=studio&page=3',
    );
  });

  it('falls back to open projects when the address names a status that does not exist', async () => {
    const { fetchMock } = openList(
      [sampleAdminProjectSummary()],
      {},
      '/admin/projects?status=bogus',
    );
    await screen.findByRole('list', { name: 'Projects' });
    expect(requestedUrls(fetchMock)).toContain(open20);
    expect(screen.getByLabelText('Show')).toHaveValue('open');
  });

  it('says so when there are no open projects, and offers every project', async () => {
    openList([]);
    expect(
      await screen.findByRole('heading', { level: 2, name: 'No open projects' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Show every project' })).toHaveAttribute(
      'href',
      '/admin/projects?status=all',
    );
  });

  it('says so when nothing matches the filter or search, and goes back to open projects', async () => {
    openList(
      [],
      {
        'GET /api/v1/admin/project-requests?status=completed&page=1&limit=20': () =>
          jsonResponse(200, pageOf([])),
      },
      '/admin/projects?status=completed',
    );
    expect(
      await screen.findByRole('heading', { level: 2, name: 'No projects match' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Show open projects' })).toHaveAttribute(
      'href',
      '/admin/projects',
    );
  });

  it('says so when the page asked for is past the end', async () => {
    openList(
      [],
      {
        'GET /api/v1/admin/project-requests?status=open&page=9&limit=20': () =>
          jsonResponse(200, pageOf([], 5, 9)),
      },
      '/admin/projects?page=9',
    );
    expect(
      await screen.findByRole('heading', { name: 'There are no projects on this page' }),
    ).toBeVisible();
  });

  it('says so, and tries again on request, when the list cannot be loaded', async () => {
    let calls = 0;
    const { user } = openList([], {
      [`GET ${open20}`]: () => {
        calls += 1;
        return calls === 1
          ? jsonResponse(503, {
              error: {
                code: 'SERVICE_UNAVAILABLE',
                message: 'This part of the site is temporarily unavailable.',
              },
            })
          : jsonResponse(200, pageOf([sampleAdminProjectSummary({ title: 'Back again' })]));
      },
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('temporarily unavailable');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('link', { name: /Back again/ })).toBeVisible();
  });
});
