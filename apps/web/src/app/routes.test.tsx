import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { catalogueRoutes, mockApi } from '../test/mock-api';
import { routes } from './routes';

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(() => {
  mockApi(catalogueRoutes());
});

describe('app routes', () => {
  it.each([
    ['/', 'Your Idea. Your Design. Our Development.', 'Prajzo · Web development studio'],
    ['/services', 'Websites and web apps for every need', 'Services · Prajzo'],
    ['/how-it-works', 'A clear path from idea to launch', 'How It Works · Prajzo'],
    ['/pricing', 'Affordable prices, agreed up front', 'Pricing and Plans · Prajzo'],
    ['/about', 'We build websites that work for you', 'About Us · Prajzo'],
    ['/contact', 'Talk to us', 'Contact Us · Prajzo'],
    ['/start-project', 'Tell us about your project', 'Start a Project · Prajzo'],
    ['/privacy', 'Privacy Policy', 'Privacy Policy · Prajzo'],
    ['/terms', 'Terms and Conditions', 'Terms and Conditions · Prajzo'],
  ])('%s shows its page', async (path, heading, title) => {
    renderAt(path);
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
    // The tab title is set a moment after the page appears.
    await waitFor(() => expect(document.title).toBe(title));
  });

  it('shows the custom 404 page for unknown addresses', async () => {
    renderAt('/this-page-does-not-exist');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe('Page not found · Prajzo'));
  });

  it('takes the visitor home from the 404 page', async () => {
    const router = renderAt('/missing');
    await userEvent.click(await screen.findByRole('link', { name: 'Back to the home page' }));
    expect(router.state.location.pathname).toBe('/');
  });

  it('has the main navigation and a Start a Project button in the header', async () => {
    renderAt('/');
    const header = await screen.findByRole('banner');
    const nav = within(header).getByRole('navigation', { name: 'Main' });
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Home', 'Services', 'How It Works', 'Pricing', 'Contact']);
    expect(within(header).getByRole('link', { name: 'Start a Project' })).toHaveAttribute(
      'href',
      '/start-project',
    );
  });

  it('shows contact details and legal links in the footer', async () => {
    renderAt('/');
    const footer = await screen.findByRole('contentinfo');
    expect(within(footer).getByRole('link', { name: 'contact@prajzo.com' })).toHaveAttribute(
      'href',
      'mailto:contact@prajzo.com',
    );
    expect(within(footer).getByRole('link', { name: '+91 98866 07720' })).toHaveAttribute(
      'href',
      'tel:+919886607720',
    );
    expect(within(footer).getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute(
      'href',
      '/privacy',
    );
    expect(within(footer).getByRole('link', { name: 'Terms and Conditions' })).toHaveAttribute(
      'href',
      '/terms',
    );
  });

  it('wraps every page in the header, main area, footer and a skip link', async () => {
    renderAt('/');
    expect(await screen.findByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute(
      'href',
      '#main',
    );
    expect(screen.getByRole('link', { name: /Chat with Prajzo on WhatsApp/ })).toHaveAttribute(
      'href',
      expect.stringContaining('https://wa.me/919886607720') as string,
    );
  });
});
