import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  catalogueRoutes,
  jsonResponse,
  mockApi,
  sampleAdmin,
  sampleAuditEntry,
  sampleOverview,
  signedInAs,
} from '../../test/mock-api';
import { renderApp } from '../../test/render-app';

function openOverview(overview = sampleOverview()) {
  mockApi({
    ...catalogueRoutes(),
    ...signedInAs(sampleAdmin),
    'GET /api/v1/admin/overview': () => jsonResponse(200, overview),
  });
  renderApp('/admin');
}

/** A labelled section of the page, found by its heading. */
const under = async (name: string) => within(await screen.findByRole('region', { name }));

describe('the admin overview', () => {
  it('lists what needs doing, each linking to the matching list', async () => {
    openOverview(
      sampleOverview({
        contactMessages: { total: 5, unread: 2 },
        projectRequests: {
          ...sampleOverview().projectRequests,
          toDo: { newRequests: 3, replies: 1, accepted: 0, revisions: 2, signedOff: 1 },
        },
      }),
    );

    const todo = await under('Needs you now');
    expect(todo.getByRole('link', { name: /New requests/ })).toHaveAttribute(
      'href',
      '/admin/projects?status=received',
    );
    expect(todo.getByRole('link', { name: /New requests/ })).toHaveTextContent('3');
    expect(todo.getByRole('link', { name: /Customer replies/ })).toHaveAttribute(
      'href',
      '/admin/projects?status=awaiting-information',
    );
    expect(todo.getByRole('link', { name: /Customer replies/ })).toHaveTextContent('1');
    expect(todo.getByRole('link', { name: /Changes asked for/ })).toHaveTextContent('2');
    expect(todo.getByRole('link', { name: /Changes asked for/ })).toHaveAttribute(
      'href',
      '/admin/projects?status=revision-requested',
    );
    expect(todo.getByRole('link', { name: /Said it looks good/ })).toHaveTextContent('1');
    expect(todo.getByRole('link', { name: /Said it looks good/ })).toHaveAttribute(
      'href',
      '/admin/projects?status=awaiting-review',
    );
    expect(todo.getByRole('link', { name: /New messages/ })).toHaveTextContent('2');
    expect(todo.getByRole('link', { name: /New messages/ })).toHaveAttribute(
      'href',
      '/admin/messages?status=new',
    );
  });

  it('says plainly when nothing is waiting, rather than showing a bare zero', async () => {
    openOverview(
      sampleOverview({
        contactMessages: { total: 5, unread: 0 },
        projectRequests: {
          ...sampleOverview().projectRequests,
          toDo: { newRequests: 0, replies: 0, accepted: 0, revisions: 0, signedOff: 0 },
        },
      }),
    );

    const todo = await under('Needs you now');
    expect(todo.getAllByText('Nothing waiting')).toHaveLength(6);
  });

  it('shows how many projects are in every status, each linking to that list', async () => {
    openOverview();

    const statuses = await under('Projects by status');
    expect(statuses.getAllByRole('link')).toHaveLength(12); // eleven statuses and "all projects"
    expect(statuses.getByRole('link', { name: 'Quote Sent 2' })).toHaveAttribute(
      'href',
      '/admin/projects?status=quote-sent',
    );
    expect(statuses.getByRole('link', { name: 'Request Received 1' })).toBeVisible();
    // A status nobody is in still appears, with a real zero.
    expect(statuses.getByRole('link', { name: 'Completed 0' })).toBeVisible();
    expect(statuses.getByRole('link', { name: 'All 4 projects' })).toHaveAttribute(
      'href',
      '/admin/projects?status=all',
    );
  });

  it('says "1 project", not "1 projects"', async () => {
    openOverview(
      sampleOverview({
        projectRequests: { ...sampleOverview().projectRequests, total: 1 },
      }),
    );
    expect(
      await (await under('Projects by status')).findByRole('link', { name: 'All 1 project' }),
    ).toBeVisible();
  });

  it('shows the totals', async () => {
    openOverview(sampleOverview({ customers: 12, contactMessages: { total: 30, unread: 4 } }));

    const glance = await under('At a glance');
    expect(glance.getByText('Customers').nextElementSibling).toHaveTextContent('12');
    expect(glance.getByText('Project requests').nextElementSibling).toHaveTextContent('4');
    expect(glance.getByText('Contact messages').nextElementSibling).toHaveTextContent('30');
  });

  it('shows recent activity, each entry linking to what it was about', async () => {
    openOverview(
      sampleOverview({
        recentActivity: [
          sampleAuditEntry(),
          sampleAuditEntry({
            id: 'audit-2',
            actorName: 'Prajzo Admin',
            actorRole: 'admin',
            summary: 'Moved PRZ-2026-0001 to Under Review',
            targetType: 'project',
            targetId: 'PRZ-2026-0001',
          }),
          sampleAuditEntry({
            id: 'audit-3',
            actorRole: 'admin',
            actorName: 'Prajzo Admin',
            summary: 'Changed the price of Professional Website',
            targetType: 'package',
            targetId: 'professional-website',
          }),
        ],
      }),
    );

    const activity = await under('Recent activity');
    const items = activity.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(
      within(items[0]!).getByRole('link', { name: 'Sent the project "Website for my studio"' }),
    ).toHaveAttribute('href', '/admin/projects/PRZ-2026-0001');
    expect(within(items[0]!).getByText('Asha Rao')).toBeVisible();
    expect(within(items[0]!).getByText('Customer')).toBeVisible();
    expect(within(items[0]!).getByText('23 Oct 2026, 7:00 pm')).toBeVisible();
    expect(within(items[1]!).getByText('Admin')).toBeVisible();
    expect(
      within(items[2]!).getByRole('link', { name: 'Changed the price of Professional Website' }),
    ).toHaveAttribute('href', '/admin/catalogue/packages/professional-website');
    expect(activity.getByRole('link', { name: 'See all activity' })).toHaveAttribute(
      'href',
      '/admin/activity',
    );
  });

  it('says so when nothing has happened yet', async () => {
    openOverview(sampleOverview({ recentActivity: [] }));
    expect(await screen.findByRole('heading', { name: 'Nothing has happened yet' })).toBeVisible();
  });

  it('says so, and tries again on request, when the numbers cannot be loaded', async () => {
    let calls = 0;
    mockApi({
      ...catalogueRoutes(),
      ...signedInAs(sampleAdmin),
      'GET /api/v1/admin/overview': () => {
        calls += 1;
        return calls === 1
          ? jsonResponse(503, {
              error: {
                code: 'SERVICE_UNAVAILABLE',
                message: 'This part of the site is temporarily unavailable.',
              },
            })
          : jsonResponse(200, sampleOverview());
      },
    });
    const user = userEvent.setup();
    renderApp('/admin');

    expect(await screen.findByRole('alert')).toHaveTextContent('temporarily unavailable');
    expect(screen.queryByRole('heading', { name: 'Needs you now' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Needs you now' })).toBeVisible();
  });
});

describe('the admin navigation', () => {
  it('offers every section, marks the current one, and works on a phone-width bar', async () => {
    openOverview();
    await screen.findByRole('heading', { name: 'Needs you now' });

    const nav = within(screen.getByRole('navigation', { name: 'Administration' }));
    const names = nav.getAllByRole('link').map((link) => link.textContent);
    expect(names).toEqual([
      'Overview',
      'Projects',
      'Customers',
      'Messages',
      'Catalogue',
      'Activity',
    ]);
    expect(nav.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
    expect(nav.getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '/admin/projects');
    expect(nav.getByRole('link', { name: 'Projects' })).not.toHaveAttribute('aria-current');
    // The bar scrolls sideways instead of wrapping or overflowing the page.
    expect(nav.getAllByRole('list')[0]).toHaveClass('overflow-x-auto');
  });

  it('keeps a link to the public website and a sign-out button', async () => {
    openOverview();
    await screen.findByRole('heading', { name: 'Needs you now' });

    const header = within(screen.getByRole('banner'));
    expect(header.getByRole('link', { name: 'View website' })).toHaveAttribute('href', '/');
    expect(header.getByRole('button', { name: 'Sign out' })).toBeVisible();
  });
});
