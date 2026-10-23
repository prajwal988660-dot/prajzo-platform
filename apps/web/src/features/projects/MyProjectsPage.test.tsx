import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  catalogueRoutes,
  jsonResponse,
  mockApi,
  projectList,
  requestedUrls,
  sampleCustomer,
  sampleProjectSummary,
  signedInAs,
} from '../../test/mock-api';
import { currentAddress, renderApp } from '../../test/render-app';

type Routes = Parameters<typeof mockApi>[0];

async function openProjects(path = '/account/projects', extra: Routes = {}) {
  const fetchMock = mockApi({ ...catalogueRoutes(), ...signedInAs(sampleCustomer), ...extra });
  const user = userEvent.setup();
  const router = renderApp(path);
  await screen.findByRole('heading', { level: 1, name: 'My projects' });
  return { fetchMock, user, router };
}

const first = sampleProjectSummary({ reference: 'PRZ-2026-0001', title: 'Studio website' });
const second = sampleProjectSummary({
  reference: 'PRZ-2026-0002',
  title: 'Shop website',
  status: 'quote-sent',
  categoryTitle: 'Online Shops',
});

describe('My projects', () => {
  it('sends a signed-out visitor to sign in, and back here afterwards', async () => {
    mockApi(catalogueRoutes());
    const router = renderApp('/account/projects');

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
    expect(currentAddress(router)).toBe('/login?next=%2Faccount%2Fprojects');
  });

  it('lists each project with its reference, type, date and status, linking to its page', async () => {
    await openProjects('/account/projects', {
      'GET /api/v1/project-requests?page=1&limit=10': () =>
        jsonResponse(200, projectList([second, first])),
    });

    expect(await screen.findByText('2 projects')).toBeVisible();
    const items = within(screen.getByRole('list', { name: 'Your projects' })).getAllByRole(
      'listitem',
    );
    const shop = within(items[0]!);
    expect(shop.getByRole('link', { name: /Shop website/ })).toHaveAttribute(
      'href',
      '/account/projects/PRZ-2026-0002',
    );
    expect(shop.getByText('PRZ-2026-0002', { exact: false })).toBeVisible();
    expect(shop.getByText(/Online Shops/)).toBeVisible();
    expect(shop.getByText(/Sent 23 Oct 2026/)).toBeVisible();
    expect(shop.getByText('Quote Sent')).toBeVisible();
    expect(within(items[1]!).getByText('Request Received')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Start a project' })).toHaveAttribute(
      'href',
      '/start-project',
    );
  });

  it('says "1 project" for one', async () => {
    await openProjects('/account/projects', {
      'GET /api/v1/project-requests?page=1&limit=10': () => jsonResponse(200, projectList([first])),
    });
    expect(await screen.findByText('1 project')).toBeVisible();
  });

  it('has no page links when everything fits on one page', async () => {
    await openProjects('/account/projects', {
      'GET /api/v1/project-requests?page=1&limit=10': () =>
        jsonResponse(200, projectList([first, second])),
    });
    await screen.findByText('2 projects');
    expect(screen.queryByRole('navigation', { name: 'Pages of projects' })).not.toBeInTheDocument();
  });

  it('is honest when there are no projects, and offers to start one', async () => {
    await openProjects('/account/projects', {
      'GET /api/v1/project-requests?page=1&limit=10': () => jsonResponse(200, projectList([])),
    });

    expect(await screen.findByRole('heading', { name: 'No projects yet' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Start a project' })).toHaveAttribute(
      'href',
      '/start-project',
    );
  });

  it('moves between pages, asking the server for each', async () => {
    const { fetchMock, user } = await openProjects('/account/projects', {
      'GET /api/v1/project-requests?page=1&limit=10': () =>
        jsonResponse(200, projectList([second], 25, 1, 10)),
      'GET /api/v1/project-requests?page=2&limit=10': () =>
        jsonResponse(200, projectList([first], 25, 2, 10)),
    });

    expect(await screen.findByText('Page 1 of 3')).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Previous' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Next' })).toHaveAttribute(
      'href',
      '/account/projects?page=2',
    );

    await user.click(screen.getByRole('link', { name: 'Next' }));

    expect(await screen.findByText('Page 2 of 3')).toBeVisible();
    expect(screen.getByRole('link', { name: /Studio website/ })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Previous' })).toHaveAttribute(
      'href',
      '/account/projects?page=1',
    );
    expect(requestedUrls(fetchMock)).toContain('/api/v1/project-requests?page=2&limit=10');
  });

  it('starts at page 1 when the address has a nonsense page number', async () => {
    for (const page of ['abc', '0', '-3', '1.5']) {
      const { fetchMock } = await openProjects(`/account/projects?page=${page}`, {
        'GET /api/v1/project-requests?page=1&limit=10': () =>
          jsonResponse(200, projectList([first])),
      });
      await screen.findByRole('link', { name: /Studio website/ });
      expect(requestedUrls(fetchMock).filter((url) => url.includes('project-requests'))).toEqual([
        '/api/v1/project-requests?page=1&limit=10',
      ]);
      document.body.innerHTML = '';
    }
  });

  it('says so when the page asked for is past the end, and links back', async () => {
    await openProjects('/account/projects?page=9', {
      'GET /api/v1/project-requests?page=9&limit=10': () =>
        jsonResponse(200, projectList([], 25, 9, 10)),
    });

    expect(
      await screen.findByRole('heading', { name: 'There are no projects on this page' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Back to my projects' })).toHaveAttribute(
      'href',
      '/account/projects',
    );
  });

  it('says so when the projects could not be loaded, and tries again on request', async () => {
    let calls = 0;
    const { user } = await openProjects('/account/projects', {
      'GET /api/v1/project-requests?page=1&limit=10': () => {
        calls += 1;
        return calls === 1
          ? jsonResponse(503, {
              error: {
                code: 'SERVICE_UNAVAILABLE',
                message: 'This part of the site is temporarily unavailable.',
              },
            })
          : jsonResponse(200, projectList([first]));
      },
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('temporarily unavailable');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('link', { name: /Studio website/ })).toBeVisible();
  });

  it('asks search engines not to list it', async () => {
    await openProjects('/account/projects', {
      'GET /api/v1/project-requests?page=1&limit=10': () => jsonResponse(200, projectList([first])),
    });
    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
  });
});
