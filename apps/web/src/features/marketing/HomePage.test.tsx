import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { routes } from '../../app/routes';
import {
  catalogueRoutes,
  jsonResponse,
  mockApi,
  sampleCategories,
  samplePackages,
} from '../../test/mock-api';

function renderHome() {
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/'] })} />);
}

describe('Home page', () => {
  it('shows the headline, delivery targets and conditions', async () => {
    mockApi(catalogueRoutes());
    renderHome();

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Your Idea. Your Design. Our Development.',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Target: Within 24 hours')).toBeVisible();
    expect(screen.getByText('Target: Within 3 days')).toBeVisible();
    expect(screen.getByText('Target: Within 7 days')).toBeVisible();
    expect(screen.getAllByText(/Delivery targets are not guarantees/).length).toBeGreaterThan(0);
  });

  it('shows the website categories and packages from the API', async () => {
    mockApi(catalogueRoutes());
    renderHome();

    for (const category of sampleCategories) {
      expect(await screen.findByRole('heading', { name: category.title })).toBeVisible();
    }
    expect(screen.getByRole('link', { name: 'See all 2 services' })).toHaveAttribute(
      'href',
      '/services',
    );

    const packages = screen.getByRole('region', { name: 'Simple, affordable starting prices' });
    for (const servicePackage of samplePackages) {
      expect(within(packages).getByRole('heading', { name: servicePackage.name })).toBeVisible();
    }
    expect(within(packages).getByText('₹2,999')).toBeVisible();
    expect(within(packages).getByText('₹7,999')).toBeVisible();
  });

  it('offers a retry when a section fails to load, and recovers', async () => {
    let categoryCalls = 0;
    mockApi({
      ...catalogueRoutes(),
      'GET /api/v1/categories': () => {
        categoryCalls += 1;
        return categoryCalls === 1
          ? jsonResponse(500, {
              error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on our side.' },
            })
          : jsonResponse(200, { items: sampleCategories });
      },
    });
    const user = userEvent.setup();
    renderHome();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("This section couldn't be loaded");
    await user.click(within(alert).getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('heading', { name: 'Business Websites' })).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('only links to pages that exist', async () => {
    mockApi(catalogueRoutes());
    renderHome();
    await screen.findByRole('heading', { name: 'Business Websites' });

    const internalLinks = screen
      .getAllByRole('link')
      .map((link) => link.getAttribute('href') ?? '')
      .filter((href) => href.startsWith('/'));
    const knownPages = [
      '/',
      '/services',
      '/how-it-works',
      '/pricing',
      '/about',
      '/contact',
      '/privacy',
      '/terms',
      '/login',
      '/register',
    ];
    for (const href of internalLinks) {
      expect(knownPages, `link to ${href}`).toContain(href.split('?')[0]);
    }
  });
});
