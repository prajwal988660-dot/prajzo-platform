import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, useState } from 'react';
import { createMemoryRouter, RouterProvider, useSearchParams } from 'react-router';
import { describe, expect, it } from 'vitest';
import { Pagination, pageFromAddress } from './Pagination';

/** A list with page links under it, like every list in the app. The "loading" part mimics a page that is replaced while the next page loads. */
function List({ unmountWhileLoading = false }: { unmountWhileLoading?: boolean }) {
  const [params] = useSearchParams();
  const page = pageFromAddress(params.get('page'));
  // The page whose data has arrived. A page other than that one is "loading" on the very render
  // that the address changes, as with a real data hook, and arrives a moment later.
  const [arrived, setArrived] = useState(page);
  useEffect(() => {
    if (!unmountWhileLoading) return undefined;
    const timer = setTimeout(() => setArrived(page), 60);
    return () => clearTimeout(timer);
  }, [page, unmountWhileLoading]);
  const loading = unmountWhileLoading && arrived !== page;
  return (
    <>
      <input aria-label="Search" />
      {loading ? (
        <p>Loading</p>
      ) : (
        <>
          <ul aria-label="Projects">
            <li>Project on page {page}</li>
          </ul>
          <Pagination page={page} totalPages={3} label="Pages of projects" />
        </>
      )}
    </>
  );
}

function renderList(path = '/?page=1', options: { unmountWhileLoading?: boolean } = {}) {
  const router = createMemoryRouter([{ path: '/', element: <List {...options} /> }], {
    initialEntries: [path],
  });
  render(<RouterProvider router={router} />);
  return router;
}

describe('Pagination', () => {
  it('moves focus to the list after the visitor goes to the next page', async () => {
    renderList();
    await userEvent.click(await screen.findByRole('link', { name: 'Next' }));

    expect(await screen.findByText('Project on page 2')).toBeVisible();
    const list = screen.getByRole('list', { name: 'Projects' });
    await waitFor(() => expect(list).toHaveFocus());
  });

  it('does the same going back, and with the keyboard', async () => {
    renderList('/?page=3');
    const previous = await screen.findByRole('link', { name: 'Previous' });
    previous.focus();
    await userEvent.keyboard('{Enter}');

    expect(await screen.findByText('Project on page 2')).toBeVisible();
    await waitFor(() => expect(screen.getByRole('list', { name: 'Projects' })).toHaveFocus());
  });

  it('still moves focus when the page links are taken away while the next page loads', async () => {
    renderList('/?page=1', { unmountWhileLoading: true });
    await userEvent.click(await screen.findByRole('link', { name: 'Next' }));

    expect(await screen.findByText('Project on page 2')).toBeVisible();
    await waitFor(() => expect(screen.getByRole('list', { name: 'Projects' })).toHaveFocus());
  });

  it('does not move focus when the list is first shown, or when the address is opened directly', async () => {
    renderList('/?page=2');
    expect(await screen.findByText('Project on page 2')).toBeVisible();
    expect(screen.getByRole('list', { name: 'Projects' })).not.toHaveFocus();
    expect(document.body).toHaveFocus();
  });

  it('does not move focus away from a filter box whose search changes the list', async () => {
    renderList('/?page=1');
    const search = await screen.findByRole('textbox', { name: 'Search' });
    await userEvent.click(search);
    await userEvent.keyboard('abc');

    expect(search).toHaveFocus();
    expect(screen.getByRole('list', { name: 'Projects' })).not.toHaveFocus();
  });

  it('keeps the other parts of the address when changing page', async () => {
    const router = renderList('/?status=quoted&page=1');
    await userEvent.click(await screen.findByRole('link', { name: 'Next' }));
    await screen.findByText('Project on page 2');
    expect(router.state.location.search).toBe('?status=quoted&page=2');
  });

  it('shows nothing when there is only one page', () => {
    const router = createMemoryRouter([
      { path: '/', element: <Pagination page={1} totalPages={1} label="Pages" /> },
    ]);
    render(<RouterProvider router={router} />);
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
});

describe('pageFromAddress', () => {
  it.each([
    ['2', 2],
    ['1', 1],
    ['0', 1],
    ['-3', 1],
    ['abc', 1],
    ['2.5', 1],
    [null, 1],
    ['', 1],
  ])('reads %j as page %i', (value, page) => {
    expect(pageFromAddress(value)).toBe(page);
  });
});
