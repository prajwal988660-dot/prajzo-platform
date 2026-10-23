import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  catalogueRoutes,
  jsonBody,
  jsonResponse,
  mockApi,
  sampleCustomer,
} from '../../test/mock-api';
import { currentAddress, renderApp } from '../../test/render-app';

const wrongPassword = {
  error: {
    code: 'UNAUTHENTICATED',
    message: "That email and password don't match. Check them and try again.",
  },
};

/** An API where signing in works for one password, and `GET /auth/me` follows the sign-in. */
function signInApi(extra: Record<string, () => Response> = {}) {
  let signedIn = false;
  const fetchMock = mockApi({
    ...catalogueRoutes(),
    'GET /api/v1/auth/me': () => jsonResponse(200, { user: signedIn ? sampleCustomer : null }),
    'POST /api/v1/auth/login': (init) => {
      const body = jsonBody(init) as { password: string };
      if (body.password !== 'right-password-1') return jsonResponse(401, wrongPassword);
      signedIn = true;
      return jsonResponse(200, { user: sampleCustomer });
    },
    ...extra,
  });
  return fetchMock;
}

async function fillLogin(user: ReturnType<typeof userEvent.setup>, password: string) {
  await user.type(await screen.findByLabelText(/^Email/), 'asha@example.com');
  await user.type(screen.getByLabelText(/^Password/), password);
}

describe('Sign in page', () => {
  it('explains what is missing and sends nothing', async () => {
    const fetchMock = signInApi();
    const user = userEvent.setup();
    renderApp('/login');

    await user.click(await screen.findByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Enter your email address')).toBeVisible();
    expect(screen.getByText('Enter your password')).toBeVisible();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
  });

  it("shows the server's message for wrong details, and clears the password but not the email", async () => {
    signInApi();
    const user = userEvent.setup();
    const router = renderApp('/login');

    await fillLogin(user, 'wrong-password-1');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("We couldn't sign you in");
    expect(alert).toHaveTextContent("That email and password don't match");
    expect(screen.getByLabelText(/^Password/)).toHaveValue('');
    expect(screen.getByLabelText(/^Email/)).toHaveValue('asha@example.com');
    expect(currentAddress(router)).toBe('/login');
  });

  it('signs in and lands on the account page', async () => {
    signInApi();
    const user = userEvent.setup();
    const router = renderApp('/login');

    await fillLogin(user, 'right-password-1');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Welcome, Asha' })).toBeVisible();
    expect(currentAddress(router)).toBe('/account');
  });

  it('sends people back to the page they were trying to open', async () => {
    signInApi();
    const user = userEvent.setup();
    const router = renderApp('/login?next=%2Fpricing');

    await fillLogin(user, 'right-password-1');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Affordable prices, agreed up front' }),
    ).toBeVisible();
    expect(currentAddress(router)).toBe('/pricing');
  });

  it('ignores a "next" address that points to another website', async () => {
    signInApi();
    const user = userEvent.setup();
    const router = renderApp('/login?next=https%3A%2F%2Fevil.example%2Fsteal');

    await fillLogin(user, 'right-password-1');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { level: 1, name: /Welcome/ })).toBeVisible();
    expect(currentAddress(router)).toBe('/account');
  });

  it('tells the person when there have been too many attempts', async () => {
    signInApi({
      'POST /api/v1/auth/login': () =>
        jsonResponse(429, {
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many attempts. Please wait a few minutes and try again.',
          },
        }),
    });
    const user = userEvent.setup();
    renderApp('/login');

    await fillLogin(user, 'whatever-password-1');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts');
  });

  it('can show and hide the password while typing it', async () => {
    signInApi();
    const user = userEvent.setup();
    renderApp('/login');

    const field = await screen.findByLabelText(/^Password/);
    expect(field).toHaveAttribute('type', 'password');
    const toggle = screen.getByRole('button', { name: 'Show password' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await user.click(toggle);
    expect(field).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('links to creating an account (keeping where the person was going) and to password reset', async () => {
    signInApi();
    renderApp('/login?next=%2Fpricing');

    expect(await screen.findByRole('link', { name: 'Create an account' })).toHaveAttribute(
      'href',
      '/register?next=%2Fpricing',
    );
    expect(screen.getByRole('link', { name: 'Forgot your password?' })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
  });
});

describe('Create account page', () => {
  const fillRegistration = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.type(await screen.findByLabelText(/^Your name/), 'Asha Rao');
    await user.type(screen.getByLabelText(/^Email/), 'asha@example.com');
    await user.type(screen.getByLabelText(/^Password/), 'a-long-passphrase-9');
    await user.click(screen.getByLabelText(/I agree to the/));
  };

  it('explains every missing or weak detail and sends nothing', async () => {
    const fetchMock = signInApi();
    const user = userEvent.setup();
    renderApp('/register');

    await user.type(await screen.findByLabelText(/^Password/), 'short');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Enter your name')).toBeVisible();
    expect(screen.getByText('Enter your email address')).toBeVisible();
    expect(screen.getByText('Use at least 10 characters')).toBeVisible();
    expect(screen.getByText('Tick this box to create your account')).toBeVisible();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
  });

  it('creates the account, signs the person in, and sends the cleaned details', async () => {
    let sent: unknown;
    let created = false;
    mockApi({
      ...catalogueRoutes(),
      'GET /api/v1/auth/me': () => jsonResponse(200, { user: created ? sampleCustomer : null }),
      'POST /api/v1/auth/register': (init) => {
        sent = jsonBody(init);
        created = true;
        return jsonResponse(201, { user: sampleCustomer });
      },
    });
    const user = userEvent.setup();
    const router = renderApp('/register');

    await fillRegistration(user);
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Welcome, Asha' })).toBeVisible();
    expect(currentAddress(router)).toBe('/account');
    expect(sent).toEqual({
      name: 'Asha Rao',
      email: 'asha@example.com',
      password: 'a-long-passphrase-9',
      acceptTerms: true,
    });
  });

  it('shows "email already used" next to the email field', async () => {
    mockApi({
      ...catalogueRoutes(),
      'POST /api/v1/auth/register': () =>
        jsonResponse(409, {
          error: {
            code: 'CONFLICT',
            message: 'An account with this email already exists.',
            fields: { email: 'An account with this email already exists. Try signing in instead.' },
          },
        }),
    });
    const user = userEvent.setup();
    renderApp('/register');

    await fillRegistration(user);
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText(/Try signing in instead/)).toBeVisible();
    expect(screen.getByLabelText(/^Email/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't create your account");
    expect(screen.getByLabelText(/^Your name/)).toHaveValue('Asha Rao'); // nothing typed is lost
  });

  it('opens the Terms and Privacy Policy in a new tab, so the form is not lost', async () => {
    signInApi();
    renderApp('/register');

    await screen.findByLabelText(/I agree to the/); // the page itself has loaded
    const page = within(screen.getByRole('main'));
    const terms = page.getByRole('link', { name: /Terms and Conditions/ });
    expect(terms).toHaveAttribute('href', '/terms');
    expect(terms).toHaveAttribute('target', '_blank');
    expect(terms).toHaveAttribute('rel', expect.stringContaining('noopener'));
    const privacy = page.getByRole('link', { name: /Privacy Policy/ });
    expect(privacy).toHaveAttribute('href', '/privacy');
    expect(privacy).toHaveAttribute('target', '_blank');
  });
});

describe('Forgot password page', () => {
  it('asks for a valid email first', async () => {
    signInApi();
    const user = userEvent.setup();
    renderApp('/forgot-password');

    await user.type(await screen.findByLabelText(/^Email/), 'nope');
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));

    expect(await screen.findByText('Enter an email address like name@example.com')).toBeVisible();
  });

  it('says the same thing whether or not the email has an account, and lets the person retry', async () => {
    signInApi({
      'POST /api/v1/auth/password/forgot': () =>
        jsonResponse(202, {
          ok: true,
          message: "If an account exists for that email, we've sent a link to reset the password.",
        }),
    });
    const user = userEvent.setup();
    renderApp('/forgot-password');

    await user.type(await screen.findByLabelText(/^Email/), 'asha@example.com');
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));

    const note = await screen.findByRole('status');
    expect(note).toHaveTextContent('Check your email');
    expect(note).toHaveTextContent('If an account exists for that email');

    await user.click(screen.getByRole('button', { name: 'try again' }));
    expect(await screen.findByLabelText(/^Email/)).toBeVisible();
  });

  it('reports a failure instead of pretending the email was sent', async () => {
    signInApi({
      'POST /api/v1/auth/password/forgot': () =>
        jsonResponse(503, {
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'This part of the site is temporarily unavailable.',
          },
        }),
    });
    const user = userEvent.setup();
    renderApp('/forgot-password');

    await user.type(await screen.findByLabelText(/^Email/), 'asha@example.com');
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));

    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't send the link");
    expect(screen.queryByText('Check your email')).not.toBeInTheDocument();
  });
});

describe('Reset password page', () => {
  const token = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG';

  it('explains a link without its token, and offers a fresh one', async () => {
    signInApi();
    renderApp('/reset-password');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'This link is incomplete' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Request a new link' })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
  });

  it('checks the new password before sending it', async () => {
    const fetchMock = signInApi();
    const user = userEvent.setup();
    renderApp(`/reset-password?token=${token}`);

    await user.type(await screen.findByLabelText(/^New password/), 'short');
    await user.click(screen.getByRole('button', { name: 'Change password' }));

    expect(await screen.findByText('Use at least 10 characters')).toBeVisible();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
  });

  it("changes the password with the link's token and then offers sign-in", async () => {
    let sent: unknown;
    mockApi({
      ...catalogueRoutes(),
      'POST /api/v1/auth/password/reset': (init) => {
        sent = jsonBody(init);
        return jsonResponse(200, {
          ok: true,
          message: 'Your password has been changed. You can now sign in.',
        });
      },
    });
    const user = userEvent.setup();
    renderApp(`/reset-password?token=${token}`);

    await user.type(await screen.findByLabelText(/^New password/), 'another-long-passphrase-4');
    await user.click(screen.getByRole('button', { name: 'Change password' }));

    const done = await screen.findByRole('status');
    expect(done).toHaveTextContent('Your password has been changed');
    expect(sent).toEqual({ token, password: 'another-long-passphrase-4' });
    expect(within(screen.getByRole('main')).getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/login',
    );
  });

  it('shows a clear message when the link has expired, and keeps the form', async () => {
    signInApi({
      'POST /api/v1/auth/password/reset': () =>
        jsonResponse(400, {
          error: {
            code: 'BAD_REQUEST',
            message: 'This reset link is invalid or has expired. Please request a new one.',
          },
        }),
    });
    const user = userEvent.setup();
    renderApp(`/reset-password?token=${token}`);

    await user.type(await screen.findByLabelText(/^New password/), 'another-long-passphrase-4');
    await user.click(screen.getByRole('button', { name: 'Change password' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('invalid or has expired');
    expect(
      within(screen.getByRole('main')).getByRole('link', { name: 'Request another' }),
    ).toHaveAttribute('href', '/forgot-password');
    await waitFor(() => expect(screen.getByLabelText(/^New password/)).toBeVisible());
  });
});
