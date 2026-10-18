import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { routes } from '../../app/routes';
import { catalogueRoutes, jsonResponse, mockApi } from '../../test/mock-api';

function renderContact(path = '/contact') {
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />);
}

async function fillRequiredFields(user: UserEvent) {
  await user.type(await screen.findByLabelText(/Your name/), 'Asha Rao');
  await user.type(screen.getByLabelText(/^Email/), 'Asha@Example.com');
  await user.type(
    screen.getByLabelText(/About your project/),
    'We need a five-page website for our bakery.',
  );
  await user.click(screen.getByLabelText(/I agree that Prajzo may contact me/));
}

describe('Contact page', () => {
  it('shows a clear error for each missing detail and sends nothing', async () => {
    const fetchMock = mockApi(catalogueRoutes());
    const user = userEvent.setup();
    renderContact();

    await user.click(await screen.findByRole('button', { name: 'Send message' }));

    expect(await screen.findByText('Enter your name')).toBeVisible();
    expect(screen.getByText('Enter an email address like name@example.com')).toBeVisible();
    expect(screen.getByText('Tell us a little more (at least 20 characters)')).toBeVisible();
    expect(screen.getByText('Tick this box so we can reply to you')).toBeVisible();
    expect(screen.getByLabelText(/Your name/)).toHaveAttribute('aria-invalid', 'true');
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
  });

  it('sends the cleaned-up details and confirms only after the server has saved them', async () => {
    let sentBody: unknown;
    mockApi({
      ...catalogueRoutes(),
      'POST /api/v1/contact': (init) => {
        sentBody = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
        return jsonResponse(201, {
          received: true,
          message: 'Thanks, Asha Rao. We will reply soon.',
        });
      },
    });
    const user = userEvent.setup();
    renderContact();

    await fillRequiredFields(user);
    await user.selectOptions(screen.getByLabelText('Type of website'), 'business-websites');
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    const success = await screen.findByRole('status');
    expect(within(success).getByText('Message sent')).toBeVisible();
    expect(within(success).getByText('Thanks, Asha Rao. We will reply soon.')).toBeVisible();
    expect(sentBody).toEqual({
      name: 'Asha Rao',
      email: 'asha@example.com',
      websiteType: 'business-websites',
      message: 'We need a five-page website for our bakery.',
      consent: true,
      company: '', // the spam trap, sent empty so the server can check it
    });

    await user.click(screen.getByRole('button', { name: 'Send another message' }));
    expect(await screen.findByLabelText(/Your name/)).toHaveValue('');
  });

  it("shows the server's field messages and keeps what was typed", async () => {
    mockApi({
      ...catalogueRoutes(),
      'POST /api/v1/contact': () =>
        jsonResponse(400, {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Some details need fixing.',
            fields: { email: 'This email address cannot receive messages' },
          },
        }),
    });
    const user = userEvent.setup();
    renderContact();

    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByText('This email address cannot receive messages')).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent("Your message wasn't sent");
    expect(screen.getByLabelText(/Your name/)).toHaveValue('Asha Rao');
  });

  it('never claims success when the server cannot be reached', async () => {
    const fetchMock = mockApi(catalogueRoutes());
    const user = userEvent.setup();
    renderContact();
    await fillRequiredFields(user);

    // From now on the network fails.
    fetchMock.mockImplementation(() => Promise.reject(new TypeError('Failed to fetch')));
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("Your message wasn't sent");
    expect(alert).toHaveTextContent('could not reach the Prajzo server');
    expect(screen.queryByText('Message sent')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/About your project/)).toHaveValue(
      'We need a five-page website for our bakery.',
    );
  });

  it('pre-selects the website type and package chosen on other pages', async () => {
    mockApi(catalogueRoutes());
    renderContact('/contact?type=personal-portfolio&package=quick-launch');

    expect(await screen.findByLabelText('Type of website')).toHaveValue('personal-portfolio');
    expect(screen.getByLabelText('Package')).toHaveValue('quick-launch');
  });

  it('ignores unknown choices in the address', async () => {
    mockApi(catalogueRoutes());
    renderContact('/contact?type=spaceship');

    expect(await screen.findByLabelText('Type of website')).toHaveValue('');
  });

  it('still works when the lists of services cannot be loaded', async () => {
    mockApi({
      'GET /api/v1/categories': () =>
        jsonResponse(500, { error: { code: 'INTERNAL_ERROR', message: 'x' } }),
      'GET /api/v1/packages': () =>
        jsonResponse(500, { error: { code: 'INTERNAL_ERROR', message: 'x' } }),
    });
    renderContact();

    const typeSelect = await screen.findByLabelText('Type of website');
    await waitFor(() =>
      expect(
        within(typeSelect)
          .getAllByRole('option')
          .map((option) => option.textContent),
      ).toEqual(['Choose one (optional)', 'Something else']),
    );
  });

  it('lists every way to reach Prajzo directly', async () => {
    mockApi(catalogueRoutes());
    renderContact();

    const aside = await screen.findByRole('complementary', { name: 'Prefer to talk directly?' });
    expect(within(aside).getByRole('link', { name: /contact@prajzo.com/ })).toHaveAttribute(
      'href',
      'mailto:contact@prajzo.com',
    );
    expect(within(aside).getByRole('link', { name: /Phone/ })).toHaveAttribute(
      'href',
      'tel:+919886607720',
    );
    expect(within(aside).getByRole('link', { name: /WhatsApp/ })).toHaveAttribute(
      'href',
      expect.stringContaining('https://wa.me/919886607720') as string,
    );
    expect(within(aside).getByRole('link', { name: /@prajzoo/ })).toHaveAttribute(
      'href',
      'https://www.instagram.com/prajzoo/',
    );
  });
});
