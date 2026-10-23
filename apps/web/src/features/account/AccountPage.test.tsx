import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  catalogueRoutes,
  jsonBody,
  jsonResponse,
  mockApi,
  noProjects,
  projectList,
  sampleCustomer,
  sampleProjectSummary,
  signedInAs,
} from '../../test/mock-api';
import { renderApp } from '../../test/render-app';

async function openAccount(extra: Parameters<typeof mockApi>[0] = {}) {
  mockApi({ ...catalogueRoutes(), ...noProjects, ...signedInAs(sampleCustomer), ...extra });
  const user = userEvent.setup();
  renderApp('/account');
  await screen.findByRole('heading', { level: 1, name: 'Welcome, Asha' });
  return user;
}

describe('Account page', () => {
  it('is honest that there is nothing to show yet in the two lists', async () => {
    await openAccount();

    expect(screen.getByRole('heading', { name: 'No saved designs yet' })).toBeVisible();
    expect(await screen.findByRole('heading', { name: 'No projects yet' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Start a project' })).toHaveAttribute(
      'href',
      '/start-project',
    );
  });

  describe('your projects', () => {
    it('shows the latest ones with their status, each linking to its page', async () => {
      await openAccount({
        'GET /api/v1/project-requests?limit=3': () =>
          jsonResponse(
            200,
            projectList(
              [
                sampleProjectSummary({
                  reference: 'PRZ-2026-0002',
                  title: 'Shop website',
                  status: 'quote-sent',
                }),
                sampleProjectSummary({ reference: 'PRZ-2026-0001', title: 'Studio website' }),
              ],
              2,
              1,
              3,
            ),
          ),
      });

      const shop = await screen.findByRole('link', { name: /Shop website/ });
      expect(shop).toHaveAttribute('href', '/account/projects/PRZ-2026-0002');
      expect(within(shop).getByText('Quote Sent')).toBeVisible();
      expect(within(shop).getByText('PRZ-2026-0002')).toBeVisible();
      expect(screen.getByRole('link', { name: /Studio website/ })).toHaveAttribute(
        'href',
        '/account/projects/PRZ-2026-0001',
      );
      // All of them are on show, so the link is simply "My projects".
      expect(screen.getByRole('link', { name: 'My projects' })).toHaveAttribute(
        'href',
        '/account/projects',
      );
      expect(screen.getByRole('link', { name: 'Start a project' })).toHaveAttribute(
        'href',
        '/start-project',
      );
    });

    it('says how many there are when only the latest few are shown', async () => {
      await openAccount({
        'GET /api/v1/project-requests?limit=3': () =>
          jsonResponse(
            200,
            projectList(
              [
                sampleProjectSummary({ reference: 'PRZ-2026-0005' }),
                sampleProjectSummary({ reference: 'PRZ-2026-0004' }),
                sampleProjectSummary({ reference: 'PRZ-2026-0003' }),
              ],
              5,
              1,
              3,
            ),
          ),
      });

      expect(await screen.findByRole('link', { name: 'See all 5 projects' })).toHaveAttribute(
        'href',
        '/account/projects',
      );
    });

    it('says so when they could not be loaded, and tries again on request', async () => {
      let calls = 0;
      const user = await openAccount({
        'GET /api/v1/project-requests?limit=3': () => {
          calls += 1;
          return calls === 1
            ? jsonResponse(503, {
                error: {
                  code: 'SERVICE_UNAVAILABLE',
                  message: 'This part of the site is temporarily unavailable.',
                },
              })
            : jsonResponse(200, projectList([sampleProjectSummary()], 1, 1, 3));
        },
      });

      expect(await screen.findByRole('alert')).toHaveTextContent('temporarily unavailable');
      await user.click(screen.getByRole('button', { name: 'Try again' }));
      expect(await screen.findByRole('link', { name: /Website for my studio/ })).toBeVisible();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  it('shows the email as read-only and the saved name and phone', async () => {
    await openAccount();

    expect(screen.getByLabelText(/^Your name/)).toHaveValue('Asha Rao');
    expect(screen.getByLabelText(/^Phone/)).toHaveValue('+91 98866 07720');
    expect(screen.getByText('asha@example.com')).toBeVisible();
  });

  it('saves a changed name and phone, and the header and welcome keep up', async () => {
    let sent: unknown;
    const user = await openAccount({
      'PATCH /api/v1/me': (init) => {
        sent = jsonBody(init);
        return jsonResponse(200, { user: { ...sampleCustomer, name: 'Asha K. Rao', phone: null } });
      },
    });

    const name = screen.getByLabelText(/^Your name/);
    await user.clear(name);
    await user.type(name, 'Asha K. Rao');
    await user.clear(screen.getByLabelText(/^Phone/));
    await user.click(screen.getByRole('button', { name: 'Save details' }));

    expect(await screen.findByText('Your details have been updated.')).toBeVisible();
    expect(sent).toEqual({ name: 'Asha K. Rao' }); // an emptied phone is sent as "none"
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Welcome, Asha');
  });

  it('refuses an empty name before sending anything', async () => {
    const fetchMock = mockApi({
      ...catalogueRoutes(),
      ...noProjects,
      ...signedInAs(sampleCustomer),
    });
    const user = userEvent.setup();
    renderApp('/account');
    await screen.findByRole('heading', { level: 1, name: 'Welcome, Asha' });

    await user.clear(screen.getByLabelText(/^Your name/));
    await user.click(screen.getByRole('button', { name: 'Save details' }));

    expect(await screen.findByText('Enter your name')).toBeVisible();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(false);
  });

  it('says so when the details could not be saved', async () => {
    const user = await openAccount({
      'PATCH /api/v1/me': () =>
        jsonResponse(503, {
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'This part of the site is temporarily unavailable.',
          },
        }),
    });

    await user.click(screen.getByRole('button', { name: 'Save details' }));

    expect(await screen.findByRole('alert')).toHaveTextContent("Your details weren't saved");
    expect(screen.queryByText('Your details have been updated.')).not.toBeInTheDocument();
  });
});

describe('Change password (on the account page)', () => {
  const form = () =>
    within(screen.getByRole('heading', { name: 'Change your password' }).parentElement!);

  it('checks the new password before sending it', async () => {
    const user = await openAccount();

    await user.type(screen.getByLabelText(/^Current password/), 'a-long-passphrase-9');
    await user.type(screen.getByLabelText(/^New password/), 'short');
    await user.click(form().getByRole('button', { name: 'Change password' }));

    expect(await screen.findByText('Use at least 10 characters')).toBeVisible();
  });

  it('will not accept the same password again', async () => {
    const user = await openAccount();

    await user.type(screen.getByLabelText(/^Current password/), 'a-long-passphrase-9');
    await user.type(screen.getByLabelText(/^New password/), 'a-long-passphrase-9');
    await user.click(form().getByRole('button', { name: 'Change password' }));

    expect(
      await screen.findByText('Choose a password different from the current one'),
    ).toBeVisible();
  });

  it('shows "that is not your current password" next to the right field', async () => {
    const user = await openAccount({
      'POST /api/v1/me/password': () =>
        jsonResponse(400, {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Some details need fixing.',
            fields: { currentPassword: "That isn't your current password" },
          },
        }),
    });

    await user.type(screen.getByLabelText(/^Current password/), 'not-my-password-1');
    await user.type(screen.getByLabelText(/^New password/), 'another-long-passphrase-4');
    await user.click(form().getByRole('button', { name: 'Change password' }));

    expect(await screen.findByText("That isn't your current password")).toBeVisible();
    expect(screen.getByLabelText(/^Current password/)).toHaveAttribute('aria-invalid', 'true');
  });

  it('confirms the change and empties the fields', async () => {
    let sent: unknown;
    const user = await openAccount({
      'POST /api/v1/me/password': (init) => {
        sent = jsonBody(init);
        return jsonResponse(200, {
          ok: true,
          message: 'Your password has been changed. Other devices have been signed out.',
        });
      },
    });

    await user.type(screen.getByLabelText(/^Current password/), 'a-long-passphrase-9');
    await user.type(screen.getByLabelText(/^New password/), 'another-long-passphrase-4');
    await user.click(form().getByRole('button', { name: 'Change password' }));

    expect(await screen.findByText(/Other devices have been signed out/)).toBeVisible();
    expect(sent).toEqual({
      currentPassword: 'a-long-passphrase-9',
      newPassword: 'another-long-passphrase-4',
    });
    expect(screen.getByLabelText(/^Current password/)).toHaveValue('');
    expect(screen.getByLabelText(/^New password/)).toHaveValue('');
  });
});
