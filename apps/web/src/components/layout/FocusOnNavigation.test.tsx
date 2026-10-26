import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, Link, Outlet, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { FocusOnNavigation } from './FocusOnNavigation';

/** A small site with the same shape as the real one: a header with links, and a main area. */
function Layout() {
  return (
    <>
      <FocusOnNavigation />
      <header>
        <Link to="/">Home</Link>
        <Link to="/services">Services</Link>
        <Link to="/services?filter=new">Services, filtered</Link>
        <Link to="/empty">Empty page</Link>
        <Link to="/typing">Typing page</Link>
      </header>
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
    </>
  );
}

function Typing() {
  return (
    <>
      <h1>Typing page</h1>
      {/* A page that puts focus where the visitor will type, without being asked. */}
      <input aria-label="Search" ref={(input) => input?.focus()} />
    </>
  );
}

function renderSite(path = '/') {
  const router = createMemoryRouter(
    [
      {
        element: <Layout />,
        children: [
          { index: true, element: <h1>Home page</h1> },
          { path: 'services', element: <h1>Services page</h1> },
          { path: 'empty', element: <p>No heading here</p> },
          { path: 'typing', element: <Typing /> },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

describe('FocusOnNavigation', () => {
  it('leaves focus alone on the first page of a visit', async () => {
    renderSite('/services');
    expect(await screen.findByRole('heading', { name: 'Services page' })).toBeVisible();
    expect(document.body).toHaveFocus();
  });

  it('moves focus to the new page heading after following a link in the header', async () => {
    renderSite();
    const link = await screen.findByRole('link', { name: 'Services' });
    await userEvent.click(link);

    const heading = await screen.findByRole('heading', { name: 'Services page' });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(link).not.toHaveFocus();
  });

  it('does it for the keyboard too, so Tab then carries on from the new page', async () => {
    renderSite();
    await screen.findByRole('heading', { name: 'Home page' });
    await userEvent.tab(); // Home
    await userEvent.tab(); // Services
    await userEvent.keyboard('{Enter}');

    const heading = await screen.findByRole('heading', { name: 'Services page' });
    await waitFor(() => expect(heading).toHaveFocus());
  });

  it('only makes the heading focusable by script: Tab does not stop on it', async () => {
    renderSite();
    await userEvent.click(await screen.findByRole('link', { name: 'Services' }));
    const heading = await screen.findByRole('heading', { name: 'Services page' });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(heading).toHaveAttribute('tabindex', '-1');
  });

  it('falls back to the main area when the page has no heading yet', async () => {
    renderSite();
    await userEvent.click(await screen.findByRole('link', { name: 'Empty page' }));

    await screen.findByText('No heading here');
    await waitFor(() => expect(screen.getByRole('main')).toHaveFocus());
  });

  it('does not take focus from something the new page focused itself', async () => {
    renderSite();
    await userEvent.click(await screen.findByRole('link', { name: 'Typing page' }));

    const search = await screen.findByRole('textbox', { name: 'Search' });
    expect(search).toHaveFocus();
    await userEvent.keyboard('hello');
    expect(search).toHaveValue('hello');
  });

  it('does nothing when only the search part of the address changes: a filter keeps its focus', async () => {
    renderSite('/services');
    const heading = await screen.findByRole('heading', { name: 'Services page' });
    const link = screen.getByRole('link', { name: 'Services, filtered' });

    await userEvent.click(link);

    await waitFor(() => expect(link).toHaveFocus());
    expect(heading).not.toHaveFocus();
  });
});
