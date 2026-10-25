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
  sampleAdminCustomer,
  sampleProjectSummary,
  signedInAs,
} from '../../test/mock-api';
import { currentAddress, renderApp } from '../../test/render-app';

type Routes = Parameters<typeof mockApi>[0];
const firstPage = '/api/v1/admin/customers?page=1&limit=20';

function openList(
  items = [sampleAdminCustomer()],
  extra: Routes = {},
  path = '/admin/customers',
  total = items.length,
) {
  const fetchMock = mockApi({
    ...catalogueRoutes(),
    ...signedInAs(sampleAdmin),
    [`GET ${firstPage}`]: () => jsonResponse(200, pageOf(items, total)),
    ...extra,
  });
  const user = userEvent.setup();
  const router = renderApp(path);
  return { fetchMock, user, router };
}

describe('the customers list', () => {
  it('shows each customer with their email, when they joined, and how many projects they sent', async () => {
    openList([
      sampleAdminCustomer({ id: 'u1', name: 'Asha Rao', projectCount: 2 }),
      sampleAdminCustomer({
        id: 'u2',
        name: 'Ravi Kumar',
        email: 'ravi@example.com',
        projectCount: 1,
        createdAt: '2026-08-15T05:00:00.000Z',
      }),
      sampleAdminCustomer({ id: 'u3', name: 'Meera Joshi', projectCount: 0 }),
    ]);

    const list = within(await screen.findByRole('list', { name: 'Customers' }));
    const rows = list.getAllByRole('listitem');
    expect(rows).toHaveLength(3);
    expect(within(rows[0]!).getByRole('link', { name: /Asha Rao/ })).toHaveAttribute(
      'href',
      '/admin/customers/u1',
    );
    expect(within(rows[0]!).getByText('2 projects')).toBeVisible();
    expect(within(rows[0]!).getByText('asha@example.com')).toBeVisible();
    expect(within(rows[0]!).getByText('Joined 1 Oct 2026')).toBeVisible();
    expect(within(rows[1]!).getByText('1 project')).toBeVisible();
    expect(within(rows[1]!).getByText('Joined 15 Aug 2026')).toBeVisible();
    expect(within(rows[2]!).getByText('0 projects')).toBeVisible();
  });

  it('flags a disabled account', async () => {
    openList([sampleAdminCustomer({ status: 'disabled' })]);
    expect(await screen.findByText('Disabled')).toBeVisible();
  });

  it('counts the customers, in the singular for one', async () => {
    const { fetchMock } = openList();
    expect(await screen.findByText('1 customer')).toBeVisible();
    expect(requestedUrls(fetchMock)).toContain(firstPage);
  });

  it('searches by name or email and says what was searched for', async () => {
    const found = '/api/v1/admin/customers?page=1&limit=20&q=ravi';
    const { fetchMock, user, router } = openList([sampleAdminCustomer()], {
      [`GET ${found}`]: () =>
        jsonResponse(200, pageOf([sampleAdminCustomer({ id: 'u2', name: 'Ravi Kumar' })])),
    });
    await screen.findByRole('list', { name: 'Customers' });

    await user.type(screen.getByLabelText('Search'), ' ravi ');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByRole('link', { name: /Ravi Kumar/ })).toBeVisible();
    expect(requestedUrls(fetchMock)).toContain(found);
    expect(currentAddress(router)).toBe('/admin/customers?q=ravi');
    expect(screen.getByText(/matching/)).toHaveTextContent('1 customer matching “ravi”');
  });

  it('keeps the same search box when it is used, and follows the back button', async () => {
    const found = '/api/v1/admin/customers?page=1&limit=20&q=ravi';
    const { user, router } = openList([sampleAdminCustomer()], {
      [`GET ${found}`]: () =>
        jsonResponse(200, pageOf([sampleAdminCustomer({ id: 'u2', name: 'Ravi Kumar' })])),
    });
    await screen.findByRole('list', { name: 'Customers' });
    const box = screen.getByLabelText('Search');

    await user.type(box, 'ravi');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await screen.findByRole('link', { name: /Ravi Kumar/ });
    expect(screen.getByLabelText('Search')).toBe(box);

    await act(() => router.navigate(-1));
    await screen.findByRole('link', { name: /Asha Rao/ });
    expect(screen.getByLabelText('Search')).toHaveValue('');
  });

  it('reads the search and the page from the address', async () => {
    const path = '/api/v1/admin/customers?page=2&limit=20&q=asha';
    const { fetchMock } = openList(
      [],
      { [`GET ${path}`]: () => jsonResponse(200, pageOf([sampleAdminCustomer()], 41, 2)) },
      '/admin/customers?q=asha&page=2',
    );

    const pages = within(await screen.findByRole('navigation', { name: 'Pages of customers' }));
    expect(requestedUrls(fetchMock)).toContain(path);
    expect(screen.getByLabelText('Search')).toHaveValue('asha');
    expect(pages.getByText('Page 2 of 3')).toBeVisible();
    expect(pages.getByRole('link', { name: 'Next' })).toHaveAttribute(
      'href',
      '/admin/customers?q=asha&page=3',
    );
  });

  it('says so when there are no customers yet', async () => {
    openList([]);
    expect(
      await screen.findByRole('heading', { level: 2, name: 'No customers yet' }),
    ).toBeVisible();
  });

  it('says so when nothing matches the search', async () => {
    openList(
      [],
      { 'GET /api/v1/admin/customers?page=1&limit=20&q=zzz': () => jsonResponse(200, pageOf([])) },
      '/admin/customers?q=zzz',
    );
    expect(
      await screen.findByRole('heading', { level: 2, name: 'No customers match' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Show every customer' })).toHaveAttribute(
      'href',
      '/admin/customers',
    );
  });

  it('says so when the page asked for is past the end', async () => {
    openList(
      [],
      {
        'GET /api/v1/admin/customers?page=9&limit=20': () => jsonResponse(200, pageOf([], 5, 9)),
      },
      '/admin/customers?page=9',
    );
    expect(
      await screen.findByRole('heading', { name: 'There are no customers on this page' }),
    ).toBeVisible();
  });

  it('says so, and tries again on request, when the list cannot be loaded', async () => {
    let calls = 0;
    const { user } = openList([], {
      [`GET ${firstPage}`]: () => {
        calls += 1;
        return calls === 1
          ? jsonResponse(503, {
              error: {
                code: 'SERVICE_UNAVAILABLE',
                message: 'This part of the site is temporarily unavailable.',
              },
            })
          : jsonResponse(200, pageOf([sampleAdminCustomer({ name: 'Back again' })]));
      },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('temporarily unavailable');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('link', { name: /Back again/ })).toBeVisible();
  });
});

describe('one customer', () => {
  const customerUrl = 'GET /api/v1/admin/customers/user-1';
  const open = (body: unknown = null, extra: Routes = {}) => {
    mockApi({
      ...catalogueRoutes(),
      ...signedInAs(sampleAdmin),
      [customerUrl]: () =>
        jsonResponse(
          200,
          body ?? {
            customer: sampleAdminCustomer({ id: 'user-1' }),
            projects: [
              sampleProjectSummary({
                reference: 'PRZ-2026-0002',
                title: 'Second site',
                status: 'quote-sent',
              }),
              sampleProjectSummary({
                reference: 'PRZ-2026-0001',
                title: 'First site',
                status: 'completed',
              }),
            ],
          },
        ),
      ...extra,
    });
    const user = userEvent.setup();
    renderApp('/admin/customers/user-1');
    return { user };
  };

  it('shows how to reach them and when they joined and last signed in', async () => {
    open();
    expect(await screen.findByRole('heading', { level: 1, name: 'Asha Rao' })).toBeVisible();

    const contact = within(screen.getByRole('region', { name: 'Contact' }));
    expect(contact.getByRole('link', { name: 'asha@example.com' })).toHaveAttribute(
      'href',
      'mailto:asha@example.com',
    );
    expect(contact.getByRole('link', { name: '+91 98866 07720' })).toHaveAttribute(
      'href',
      'tel:+919886607720',
    );
    expect(contact.getByRole('link', { name: /Message on WhatsApp/ })).toHaveAttribute(
      'target',
      '_blank',
    );
    expect(contact.getByText('1 Oct 2026')).toBeVisible();
    expect(contact.getByText('23 Oct 2026, 6:30 pm')).toBeVisible();
    expect(screen.getByRole('link', { name: 'All customers' })).toHaveAttribute(
      'href',
      '/admin/customers',
    );
  });

  it('lists their projects, each opening in the admin', async () => {
    open();
    const projects = within(await screen.findByRole('list', { name: 'Projects' }));

    const rows = projects.getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]!).getByRole('link', { name: /Second site/ })).toHaveAttribute(
      'href',
      '/admin/projects/PRZ-2026-0002',
    );
    expect(within(rows[0]!).getByText('Quote Sent')).toBeVisible();
    expect(within(rows[1]!).getByText('Completed')).toBeVisible();
  });

  it('says so when they have never signed in or sent a project', async () => {
    open({
      customer: sampleAdminCustomer({
        id: 'user-1',
        phone: null,
        lastLoginAt: null,
        projectCount: 0,
      }),
      projects: [],
    });
    await screen.findByRole('heading', { level: 1, name: 'Asha Rao' });
    expect(screen.getByText('Never')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'No projects yet' })).toBeVisible();
    expect(screen.queryByRole('link', { name: /WhatsApp/ })).not.toBeInTheDocument();
  });

  it('flags a disabled account', async () => {
    open({ customer: sampleAdminCustomer({ id: 'user-1', status: 'disabled' }), projects: [] });
    expect(await screen.findByText('Account disabled')).toBeVisible();
  });

  it('says it could not be found when the server says 404', async () => {
    open(null, {
      [customerUrl]: () =>
        jsonResponse(404, { error: { code: 'NOT_FOUND', message: 'No such customer.' } }),
    });
    expect(
      await screen.findByRole('heading', { level: 1, name: "We couldn't find that customer" }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'See all customers' })).toBeVisible();
  });

  it('says so, and tries again on request, when it cannot be loaded', async () => {
    let calls = 0;
    const { user } = open(null, {
      [customerUrl]: () => {
        calls += 1;
        return calls === 1
          ? jsonResponse(503, {
              error: {
                code: 'SERVICE_UNAVAILABLE',
                message: 'This part of the site is temporarily unavailable.',
              },
            })
          : jsonResponse(200, { customer: sampleAdminCustomer({ id: 'user-1' }), projects: [] });
      },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('temporarily unavailable');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Asha Rao' })).toBeVisible();
  });
});
