import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  catalogueRoutes,
  jsonResponse,
  mockApi,
  pageOf,
  requestedUrls,
  sampleAdmin,
  sampleAuditEntry,
  signedInAs,
} from '../../test/mock-api';
import { currentAddress, renderApp } from '../../test/render-app';

type Routes = Parameters<typeof mockApi>[0];
const everything = '/api/v1/admin/activity?targetType=all&page=1&limit=25';

function openActivity(
  items = [sampleAuditEntry()],
  extra: Routes = {},
  path = '/admin/activity',
  total = items.length,
) {
  const fetchMock = mockApi({
    ...catalogueRoutes(),
    ...signedInAs(sampleAdmin),
    [`GET ${everything}`]: () => jsonResponse(200, pageOf(items, total, 1, 25)),
    ...extra,
  });
  const user = userEvent.setup();
  const router = renderApp(path);
  return { fetchMock, user, router };
}

describe('the activity page', () => {
  it('lists what people did: who, what, when, and a link to the thing it was about', async () => {
    openActivity([
      sampleAuditEntry(),
      sampleAuditEntry({
        id: 'audit-2',
        actorName: 'Prajzo Admin',
        actorRole: 'admin',
        summary: 'Marked the message from Ravi Kumar as read',
        targetType: 'contact-message',
        targetId: 'message-1',
        at: '2026-10-24T05:00:00.000Z',
      }),
      sampleAuditEntry({
        id: 'audit-3',
        actorName: 'Prajzo Admin',
        actorRole: 'admin',
        summary: 'Added the website type “Online Shops”',
        targetType: 'category',
        targetId: 'online-shop',
      }),
    ]);

    await screen.findByText('Added the website type “Online Shops”', { exact: false });
    const items = within(screen.getByRole('main'))
      .getAllByRole('listitem')
      .filter((item) => item.closest('ul')?.classList.contains('grid'));
    expect(items).toHaveLength(3);
    expect(
      within(items[0]!).getByRole('link', { name: 'Sent the project "Website for my studio"' }),
    ).toHaveAttribute('href', '/admin/projects/PRZ-2026-0001');
    expect(within(items[0]!).getByText('Customer')).toBeVisible();
    expect(within(items[0]!).getByText('23 Oct 2026, 7:00 pm')).toBeVisible();
    expect(
      within(items[1]!).getByRole('link', { name: 'Marked the message from Ravi Kumar as read' }),
    ).toHaveAttribute('href', '/admin/messages?status=all');
    expect(within(items[1]!).getByText('Admin')).toBeVisible();
    expect(within(items[1]!).getByText('24 Oct 2026, 10:30 am')).toBeVisible();
    expect(
      within(items[2]!).getByRole('link', { name: 'Added the website type “Online Shops”' }),
    ).toHaveAttribute('href', '/admin/catalogue/categories/online-shop');
  });

  it('asks for everything by default, with a filter for each kind of thing', async () => {
    const { fetchMock } = openActivity();
    await screen.findByText('Sent the project "Website for my studio"');
    expect(requestedUrls(fetchMock)).toContain(everything);

    const filters = within(screen.getByRole('navigation', { name: 'Filter the activity' }));
    expect(filters.getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Everything',
      'Projects',
      'Messages',
      'Categories',
      'Packages',
      'Templates',
      'Demo messages',
    ]);
    expect(filters.getByRole('link', { name: 'Everything' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(filters.getByRole('link', { name: 'Projects' })).not.toHaveAttribute('aria-current');
  });

  it('shows one kind of activity when its filter is chosen', async () => {
    const projects = '/api/v1/admin/activity?targetType=project&page=1&limit=25';
    const { fetchMock, user, router } = openActivity([sampleAuditEntry()], {
      [`GET ${projects}`]: () =>
        jsonResponse(200, pageOf([sampleAuditEntry({ summary: 'Only project things' })], 1, 1, 25)),
    });
    await screen.findByText('Sent the project "Website for my studio"');

    await user.click(
      within(screen.getByRole('navigation', { name: 'Filter the activity' })).getByRole('link', {
        name: 'Projects',
      }),
    );

    expect(await screen.findByText('Only project things')).toBeVisible();
    expect(requestedUrls(fetchMock)).toContain(projects);
    expect(currentAddress(router)).toBe('/admin/activity?type=project');
    expect(
      within(screen.getByRole('navigation', { name: 'Filter the activity' })).getByRole('link', {
        name: 'Projects',
      }),
    ).toHaveAttribute('aria-current', 'page');
  });

  it('shows everything when the address names a kind that does not exist', async () => {
    const { fetchMock } = openActivity([sampleAuditEntry()], {}, '/admin/activity?type=bogus');
    await screen.findByText('Sent the project "Website for my studio"');
    expect(requestedUrls(fetchMock)).toContain(everything);
  });

  it('pages through the activity', async () => {
    openActivity(
      [],
      {
        'GET /api/v1/admin/activity?targetType=all&page=2&limit=25': () =>
          jsonResponse(200, pageOf([sampleAuditEntry()], 60, 2, 25)),
      },
      '/admin/activity?page=2',
    );
    const pages = within(await screen.findByRole('navigation', { name: 'Pages of activity' }));
    expect(pages.getByText('Page 2 of 3')).toBeVisible();
    expect(pages.getByRole('link', { name: 'Previous' })).toHaveAttribute(
      'href',
      '/admin/activity?page=1',
    );
  });

  it('says so when nothing has happened yet', async () => {
    openActivity([]);
    expect(await screen.findByRole('heading', { name: 'Nothing here yet' })).toBeVisible();
    expect(
      screen.getByText('Activity appears as customers and admins use the site.'),
    ).toBeVisible();
  });

  it('says so, and offers everything, when a kind has nothing yet', async () => {
    openActivity(
      [],
      {
        'GET /api/v1/admin/activity?targetType=package&page=1&limit=25': () =>
          jsonResponse(200, pageOf([], 0, 1, 25)),
      },
      '/admin/activity?type=package',
    );
    expect(await screen.findByRole('heading', { name: 'Nothing here yet' })).toBeVisible();
    expect(screen.getByText('Nothing of this kind has happened yet.')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Show everything' })).toHaveAttribute(
      'href',
      '/admin/activity',
    );
  });

  it('says so, and tries again on request, when the activity cannot be loaded', async () => {
    let calls = 0;
    const { user } = openActivity([], {
      [`GET ${everything}`]: () => {
        calls += 1;
        return calls === 1
          ? jsonResponse(503, {
              error: {
                code: 'SERVICE_UNAVAILABLE',
                message: 'This part of the site is temporarily unavailable.',
              },
            })
          : jsonResponse(200, pageOf([sampleAuditEntry({ summary: 'Back again' })], 1, 1, 25));
      },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('temporarily unavailable');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Back again')).toBeVisible();
  });
});
