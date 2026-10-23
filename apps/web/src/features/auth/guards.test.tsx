import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  catalogueRoutes,
  jsonResponse,
  mockApi,
  requestedUrls,
  sampleAdmin,
  sampleCustomer,
  signedInAs,
} from '../../test/mock-api';
import { currentAddress, renderApp } from '../../test/render-app';

const overview = {
  customers: 12,
  contactMessages: { total: 30, unread: 4 },
  projectRequests: { total: 9, received: 3 },
};
const adminRoutes = { 'GET /api/v1/admin/overview': () => jsonResponse(200, overview) };

describe('pages for signed-in customers', () => {
  it('sends a signed-out visitor to sign in, remembering where they were going', async () => {
    mockApi(catalogueRoutes());
    const router = renderApp('/account');

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
    expect(currentAddress(router)).toBe('/login?next=%2Faccount');
  });

  it('shows a signed-in customer their account', async () => {
    mockApi({ ...catalogueRoutes(), ...signedInAs(sampleCustomer) });
    const router = renderApp('/account');

    expect(await screen.findByRole('heading', { level: 1, name: 'Welcome, Asha' })).toBeVisible();
    expect(currentAddress(router)).toBe('/account');
  });

  it.each(['/login', '/register', '/forgot-password'])(
    'keeps a signed-in customer away from %s',
    async (page) => {
      mockApi({ ...catalogueRoutes(), ...signedInAs(sampleCustomer) });
      const router = renderApp(page);

      expect(await screen.findByRole('heading', { level: 1, name: /Welcome/ })).toBeVisible();
      expect(currentAddress(router)).toBe('/account');
    },
  );

  it('sends an administrator who opens the customer account to the admin area', async () => {
    mockApi({ ...catalogueRoutes(), ...signedInAs(sampleAdmin), ...adminRoutes });
    const router = renderApp('/account');

    expect(await screen.findByRole('heading', { level: 1, name: 'Overview' })).toBeVisible();
    expect(currentAddress(router)).toBe('/admin');
  });

  it('says so, rather than wrongly asking to sign in, when the server cannot say who is signed in', async () => {
    let healthy = false;
    mockApi({
      ...catalogueRoutes(),
      'GET /api/v1/auth/me': () =>
        healthy
          ? jsonResponse(200, { user: sampleCustomer })
          : jsonResponse(503, {
              error: {
                code: 'SERVICE_UNAVAILABLE',
                message: 'This part of the site is temporarily unavailable.',
              },
            }),
    });
    const user = userEvent.setup();
    const router = renderApp('/account');

    expect(
      await screen.findByRole('heading', { name: "We can't check your sign-in right now" }),
    ).toBeVisible();
    expect(currentAddress(router)).toBe('/account'); // not bounced to /login

    healthy = true;
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Welcome, Asha' })).toBeVisible();
  });
});

describe('the administration area', () => {
  it('sends a signed-out visitor to the administrator sign-in', async () => {
    const fetchMock = mockApi({ ...catalogueRoutes(), ...adminRoutes });
    const router = renderApp('/admin');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Administrator sign in' }),
    ).toBeVisible();
    expect(currentAddress(router)).toBe('/admin/login');
    expect(requestedUrls(fetchMock).some((url) => url.includes('/admin/overview'))).toBe(false);
  });

  it('turns a signed-in customer away, and never asks the server for admin data', async () => {
    const fetchMock = mockApi({
      ...catalogueRoutes(),
      ...signedInAs(sampleCustomer),
      ...adminRoutes,
    });
    renderApp('/admin');

    expect(
      await screen.findByRole('heading', { name: "You don't have access to this page" }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Go to your account' })).toHaveAttribute(
      'href',
      '/account',
    );
    expect(requestedUrls(fetchMock).some((url) => url.includes('/admin/overview'))).toBe(false);
  });

  it('shows an administrator the overview with real numbers', async () => {
    mockApi({ ...catalogueRoutes(), ...signedInAs(sampleAdmin), ...adminRoutes });
    renderApp('/admin');

    expect(await screen.findByRole('heading', { level: 1, name: 'Overview' })).toBeVisible();
    const customers = await screen.findByText('Customers');
    expect(customers.nextElementSibling).toHaveTextContent('12');
    expect(screen.getByText('New messages').nextElementSibling).toHaveTextContent('4');
    expect(screen.getByText('All messages').nextElementSibling).toHaveTextContent('30');
    expect(screen.getByText('New project requests').nextElementSibling).toHaveTextContent('3');
    expect(screen.getByText('All project requests').nextElementSibling).toHaveTextContent('9');
    expect(screen.getByText(/Signed in as Prajzo Admin/)).toBeVisible();
  });

  it('has its own plain frame: no marketing header, footer or chat button', async () => {
    mockApi({ ...catalogueRoutes(), ...signedInAs(sampleAdmin), ...adminRoutes });
    renderApp('/admin');

    await screen.findByRole('heading', { level: 1, name: 'Overview' });
    expect(screen.getByRole('navigation', { name: 'Administration' })).toBeVisible();
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument();
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /Chat with Prajzo on WhatsApp/ }),
    ).not.toBeInTheDocument();
  });

  it('asks search engines not to list the admin pages', async () => {
    mockApi({ ...catalogueRoutes(), ...signedInAs(sampleAdmin), ...adminRoutes });
    renderApp('/admin');

    await screen.findByRole('heading', { level: 1, name: 'Overview' });
    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
  });

  it('does not show the sign-in page to an administrator who is already in', async () => {
    mockApi({ ...catalogueRoutes(), ...signedInAs(sampleAdmin), ...adminRoutes });
    const router = renderApp('/admin/login');

    expect(await screen.findByRole('heading', { level: 1, name: 'Overview' })).toBeVisible();
    expect(currentAddress(router)).toBe('/admin');
  });

  it('shows the admin sign-in with an error for a customer who tries it', async () => {
    mockApi({
      ...catalogueRoutes(),
      'POST /api/v1/auth/admin/login': () =>
        jsonResponse(401, {
          error: {
            code: 'UNAUTHENTICATED',
            message: "That email and password don't match. Check them and try again.",
          },
        }),
    });
    const user = userEvent.setup();
    renderApp('/admin/login');

    await user.type(await screen.findByLabelText(/^Email/), 'asha@example.com');
    await user.type(screen.getByLabelText(/^Password/), 'a-long-passphrase-9');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "That email and password don't match",
    );
  });

  it('lists admin numbers only after a retry when loading them fails', async () => {
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
          : jsonResponse(200, overview);
      },
    });
    const user = userEvent.setup();
    renderApp('/admin');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('temporarily unavailable');
    await user.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect((await screen.findByText('Customers')).nextElementSibling).toHaveTextContent('12');
  });
});

describe('signing out', () => {
  it('signs out from the header and returns to the home page, signed out', async () => {
    let signedIn = true;
    const fetchMock = mockApi({
      ...catalogueRoutes(),
      'GET /api/v1/auth/me': () => jsonResponse(200, { user: signedIn ? sampleCustomer : null }),
      'POST /api/v1/auth/logout': () => {
        signedIn = false;
        return new Response(null, { status: 204 });
      },
    });
    const user = userEvent.setup();
    const router = renderApp('/account');

    await screen.findByRole('heading', { level: 1, name: 'Welcome, Asha' });
    await user.click(within(screen.getByRole('banner')).getByRole('button', { name: 'Sign out' }));

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Your Idea. Your Design. Our Development.',
      }),
    ).toBeVisible();
    expect(currentAddress(router)).toBe('/');
    expect(within(screen.getByRole('banner')).getByRole('link', { name: 'Sign in' })).toBeVisible();
    expect(requestedUrls(fetchMock).some((url) => url.endsWith('/auth/logout'))).toBe(true);
  });

  it('stays signed in, and says so, when the server cannot end the session', async () => {
    mockApi({
      ...catalogueRoutes(),
      ...signedInAs(sampleCustomer),
      'POST /api/v1/auth/logout': () =>
        jsonResponse(503, {
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'This part of the site is temporarily unavailable.',
          },
        }),
    });
    const user = userEvent.setup();
    renderApp('/account');

    await screen.findByRole('heading', { level: 1, name: 'Welcome, Asha' });
    await user.click(within(screen.getByRole('banner')).getByRole('button', { name: 'Sign out' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("You're still signed in");
    // Nothing pretends the sign-out worked: the account link is still there.
    expect(
      within(screen.getByRole('banner')).getByRole('link', { name: 'My account' }),
    ).toBeVisible();
  });
});

describe('the header', () => {
  it('offers Sign in to visitors, and My account and Sign out to customers', async () => {
    mockApi(catalogueRoutes());
    renderApp('/');
    const banner = within(await screen.findByRole('banner'));
    expect(await banner.findByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(banner.queryByRole('link', { name: 'My account' })).not.toBeInTheDocument();
  });

  it('shows the customer their own links once signed in', async () => {
    mockApi({ ...catalogueRoutes(), ...signedInAs(sampleCustomer) });
    renderApp('/');
    const banner = within(await screen.findByRole('banner'));
    expect(await banner.findByRole('link', { name: 'My account' })).toHaveAttribute(
      'href',
      '/account',
    );
    expect(banner.getByRole('button', { name: 'Sign out' })).toBeVisible();
    expect(banner.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument();
  });

  it('points an administrator to the admin area', async () => {
    mockApi({ ...catalogueRoutes(), ...signedInAs(sampleAdmin) });
    renderApp('/');
    const banner = within(await screen.findByRole('banner'));
    expect(await banner.findByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
  });

  it('shows neither sign-in nor account links until the server has said who is signed in', async () => {
    mockApi({
      ...catalogueRoutes(),
      'GET /api/v1/auth/me': () =>
        jsonResponse(503, {
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'This part of the site is temporarily unavailable.',
          },
        }),
    });
    renderApp('/');
    const banner = within(await screen.findByRole('banner'));
    await screen.findByRole('heading', { level: 1, name: /Your Idea/ });
    expect(banner.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument();
    expect(banner.queryByRole('link', { name: 'My account' })).not.toBeInTheDocument();
  });
});
