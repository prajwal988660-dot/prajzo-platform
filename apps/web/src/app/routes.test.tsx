import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { routes } from './routes';

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

describe('app routes', () => {
  it("shows the home page with the brief's headline", async () => {
    renderAt('/');
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Your Idea. Your Design. Our Development.',
      }),
    ).toBeInTheDocument();
    expect(document.title).toBe('Prajzo · Web development studio');
  });

  it('shows the custom 404 page for unknown addresses', async () => {
    renderAt('/this-page-does-not-exist');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument();
    expect(document.title).toBe('Page not found · Prajzo');
  });

  it('takes the visitor home from the 404 page', async () => {
    const router = renderAt('/missing');
    await userEvent.click(await screen.findByRole('link', { name: 'Back to the home page' }));
    expect(router.state.location.pathname).toBe('/');
    expect(await screen.findByRole('heading', { level: 1, name: /Your Idea/ })).toBeInTheDocument();
  });

  it('wraps every page in the header, main area and footer', async () => {
    renderAt('/');
    expect(await screen.findByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute(
      'href',
      '#main',
    );
  });
});
