import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { routes } from '../app/routes';

/** Renders the whole website (header, pages, sign-in state) at an address. */
export function renderApp(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

/** Where the router currently is, for example "/login?next=%2Faccount". */
export function currentAddress(router: ReturnType<typeof renderApp>): string {
  const { pathname, search } = router.state.location;
  return pathname + search;
}
