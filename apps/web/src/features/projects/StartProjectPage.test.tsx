import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  catalogueRoutes,
  jsonBody,
  jsonResponse,
  mockApi,
  requestedUrls,
  sampleAdmin,
  sampleCategories,
  sampleCustomer,
  sampleProject,
  signedInAs,
} from '../../test/mock-api';
import { currentAddress, renderApp } from '../../test/render-app';

type Routes = Parameters<typeof mockApi>[0];

/** Opens the page as a visitor (user = null), a customer or an administrator. */
async function openStart(
  path = '/start-project',
  {
    as = sampleCustomer,
    extra = {},
  }: { as?: typeof sampleCustomer | typeof sampleAdmin | null; extra?: Routes } = {},
) {
  const fetchMock = mockApi({ ...catalogueRoutes(), ...(as ? signedInAs(as) : {}), ...extra });
  const user = userEvent.setup();
  const router = renderApp(path);
  await screen.findByRole('heading', { level: 1, name: 'Tell us about your project' });
  // The page shows as soon as it loads; wait for the server to say who is signed in.
  await waitFor(() => expect(screen.queryAllByText(/Checking your sign-in/)).toHaveLength(0));
  return { fetchMock, user, router };
}

const description =
  'A simple five-page website for my photography studio, with a gallery and a contact form.';

/** Fills in the smallest valid request. */
async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText(/^Project name/), 'Website for my studio');
  await user.selectOptions(screen.getByLabelText(/^Type of website/), 'business-websites');
  await user.type(screen.getByLabelText(/^About your project/), description);
}

const sendButton = () => screen.getByRole('button', { name: 'Send project request' });

describe('Start a Project page: for visitors', () => {
  it('explains what happens next and offers a plain message instead', async () => {
    await openStart('/start-project', { as: null });

    const steps = within(screen.getByRole('heading', { name: 'What happens next' }).parentElement!);
    expect(steps.getAllByRole('listitem')).toHaveLength(3);
    expect(steps.getByText(/Nothing starts until you've accepted the quote/)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Send us a message' })).toHaveAttribute(
      'href',
      '/contact',
    );
  });

  it('asks them to sign in or create an account, remembering to come back here', async () => {
    await openStart('/start-project', { as: null });

    expect(screen.getByRole('heading', { name: 'Sign in to send your project' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Create a free account' })).toHaveAttribute(
      'href',
      '/register?next=%2Fstart-project',
    );
    // (The header has a "Sign in" link too; this is the one on the page itself.)
    expect(within(screen.getByRole('main')).getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/login?next=%2Fstart-project',
    );
    expect(screen.queryByLabelText(/^Project name/)).not.toBeInTheDocument();
  });

  it('keeps a chosen service or package when they come back after signing in', async () => {
    await openStart('/start-project?type=business-websites&package=quick-launch', { as: null });

    const returnTo = encodeURIComponent(
      '/start-project?type=business-websites&package=quick-launch',
    );
    expect(screen.getByRole('link', { name: 'Create a free account' })).toHaveAttribute(
      'href',
      `/register?next=${returnTo}`,
    );
  });

  it('says so when it cannot tell whether they are signed in, and tries again on request', async () => {
    let calls = 0;
    const user = userEvent.setup();
    mockApi({
      ...catalogueRoutes(),
      'GET /api/v1/auth/me': () => {
        calls += 1;
        return calls === 1
          ? jsonResponse(503, {
              error: { code: 'SERVICE_UNAVAILABLE', message: 'Temporarily unavailable.' },
            })
          : jsonResponse(200, { user: sampleCustomer });
      },
    });
    renderApp('/start-project');

    expect(
      await screen.findByText("We can't check whether you're signed in right now"),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByLabelText(/^Project name/)).toBeVisible();
  });
});

describe('Start a Project page: for an administrator', () => {
  it("explains that projects come from customer accounts, and doesn't show the form", async () => {
    await openStart('/start-project', { as: sampleAdmin });

    expect(screen.getByText("You're signed in as an administrator")).toBeVisible();
    expect(screen.queryByLabelText(/^Project name/)).not.toBeInTheDocument();
  });
});

describe('Start a Project page: the form', () => {
  it('has every field, with the website types and packages from the catalogue', async () => {
    await openStart();

    const type = await screen.findByLabelText(/^Type of website/);
    expect(
      within(type)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Choose one', 'Business Websites', 'Personal Portfolio Websites', 'Something else']);
    const packageSelect = screen.getByLabelText(/^Package/);
    expect(
      within(packageSelect).getByRole('option', { name: 'Quick Launch (from ₹2,999)' }),
    ).toBeVisible();
    expect(within(packageSelect).getByRole('option', { name: 'Not sure yet' })).toBeVisible();

    const features = screen.getByRole('group', { name: "Features you'd like" });
    expect(within(features).getAllByRole('checkbox')).toHaveLength(10);
    expect(screen.getByRole('group', { name: 'Services to connect' })).toBeVisible();
    expect(screen.getByLabelText(/^Preferred date/)).toBeVisible();
    expect(screen.getByLabelText(/^How should we contact you/)).toHaveValue('email');
  });

  it("starts with the phone number from the customer's profile, and says who is sending", async () => {
    await openStart();

    expect(await screen.findByLabelText(/^Phone or WhatsApp/)).toHaveValue('+91 98866 07720');
    expect(screen.getByText('Asha Rao')).toBeVisible();
    expect(screen.getByText(/asha@example.com/)).toBeVisible();
  });

  it('can start with the website type and package already chosen', async () => {
    await openStart('/start-project?type=personal-portfolio&package=quick-launch');

    expect(await screen.findByLabelText(/^Type of website/)).toHaveValue('personal-portfolio');
    expect(screen.getByLabelText(/^Package/)).toHaveValue('quick-launch');
  });

  it('ignores a choice it does not recognise', async () => {
    await openStart('/start-project?type=spaceship&package=platinum');

    expect(await screen.findByLabelText(/^Type of website/)).toHaveValue('');
    expect(screen.getByLabelText(/^Package/)).toHaveValue('');
  });

  it('checks everything before sending, and sends nothing while something is wrong', async () => {
    const { fetchMock, user } = await openStart();
    await screen.findByLabelText(/^Project name/);

    await user.click(sendButton());

    expect(
      await screen.findByText('Give your project a short name (at least 3 characters)'),
    ).toBeVisible();
    expect(screen.getByText('Choose the type of website you need')).toBeVisible();
    expect(screen.getByText('Tell us a little more (at least 30 characters)')).toBeVisible();
    expect(screen.getByLabelText(/^Project name/)).toHaveAttribute('aria-invalid', 'true');
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
  });

  it('needs a phone number when they want a call or WhatsApp', async () => {
    const { user } = await openStart('/start-project', {
      extra: {
        'POST /api/v1/project-requests': () => jsonResponse(201, { project: sampleProject() }),
      },
    });
    await fillRequired(user);
    await user.clear(screen.getByLabelText(/^Phone or WhatsApp/));
    await user.selectOptions(screen.getByLabelText(/^How should we contact you/), 'whatsapp');
    expect(screen.getByText('We need it to reach you this way.')).toBeVisible();

    await user.click(sendButton());
    expect(
      await screen.findByText('Add a phone number so we can reach you that way'),
    ).toBeVisible();
    expect(screen.queryByText('Your project request has been sent')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/^Phone or WhatsApp/), '+91 98866 07720');
    await user.click(sendButton());
    expect(await screen.findByText('Your project request has been sent')).toBeVisible();
  });

  it('refuses a preferred date that has passed', async () => {
    const { user } = await openStart();
    await fillRequired(user);
    fireEvent.change(screen.getByLabelText(/^Preferred date/), { target: { value: '2020-01-01' } });

    await user.click(sendButton());

    expect(await screen.findByText("Choose a date that hasn't passed")).toBeVisible();
  });

  it('sends what was filled in, then shows the reference number and where to go next', async () => {
    let sent: unknown;
    const { user } = await openStart('/start-project', {
      extra: {
        'POST /api/v1/project-requests': (init) => {
          sent = jsonBody(init);
          return jsonResponse(201, { project: sampleProject({ reference: 'PRZ-2026-0007' }) });
        },
      },
    });
    await fillRequired(user);
    await user.selectOptions(screen.getByLabelText(/^Package/), 'professional-website');
    await user.click(screen.getByLabelText('Photo or video gallery'));
    await user.click(screen.getByLabelText('Contact or enquiry form'));
    await user.click(screen.getByLabelText('Google Maps'));
    fireEvent.change(screen.getByLabelText(/^Preferred date/), { target: { value: '2099-01-31' } });
    await user.selectOptions(screen.getByLabelText(/^How should we contact you/), 'whatsapp');
    await user.type(screen.getByLabelText(/^Anything else/), 'Please message after 5 pm.');

    await user.click(sendButton());

    expect(await screen.findByText('Your project request has been sent')).toBeVisible();
    expect(sent).toEqual({
      title: 'Website for my studio',
      categoryKey: 'business-websites',
      packageKey: 'professional-website',
      description,
      features: ['contact-form', 'gallery'],
      integrations: ['google-maps'],
      preferredDate: '2099-01-31',
      contactPreference: 'whatsapp',
      phone: '+91 98866 07720',
      notes: 'Please message after 5 pm.',
    });
    expect(screen.getByText('PRZ-2026-0007')).toBeVisible();
    expect(screen.getByRole('link', { name: 'View this project' })).toHaveAttribute(
      'href',
      '/account/projects/PRZ-2026-0007',
    );
    expect(screen.getByRole('link', { name: 'All my projects' })).toHaveAttribute(
      'href',
      '/account/projects',
    );
    // It does not claim an email was sent: that is not something the page can know.
    expect(screen.queryByText(/emailed|email you|sent you an email/i)).not.toBeInTheDocument();
  });

  it('leaves out what was not filled in', async () => {
    let sent: Record<string, unknown> = {};
    const { user } = await openStart('/start-project', {
      extra: {
        'POST /api/v1/project-requests': (init) => {
          sent = jsonBody(init) as Record<string, unknown>;
          return jsonResponse(201, { project: sampleProject() });
        },
      },
    });
    await fillRequired(user);
    await user.clear(screen.getByLabelText(/^Phone or WhatsApp/));

    await user.click(sendButton());
    await screen.findByText('Your project request has been sent');

    expect(Object.keys(sent).sort()).toEqual(
      [
        'categoryKey',
        'contactPreference',
        'description',
        'features',
        'integrations',
        'title',
      ].sort(),
    );
  });

  it('can be used again for another project, starting empty', async () => {
    const { user } = await openStart('/start-project', {
      extra: {
        'POST /api/v1/project-requests': () => jsonResponse(201, { project: sampleProject() }),
      },
    });
    await fillRequired(user);
    await user.click(sendButton());
    await screen.findByText('Your project request has been sent');

    await user.click(screen.getByRole('button', { name: 'Send another project' }));

    expect(await screen.findByLabelText(/^Project name/)).toHaveValue('');
    expect(screen.getByLabelText(/^Type of website/)).toHaveValue('');
  });

  it('sends only once when the button is pressed twice', async () => {
    let sends = 0;
    const { user } = await openStart('/start-project', {
      extra: {
        'POST /api/v1/project-requests': async () => {
          sends += 1;
          await new Promise((resolve) => setTimeout(resolve, 100));
          return jsonResponse(201, { project: sampleProject() });
        },
      },
    });
    await fillRequired(user);

    await user.dblClick(sendButton());

    await screen.findByText('Your project request has been sent');
    expect(sends).toBe(1);
  });

  it("puts the server's messages next to the fields and keeps what was typed", async () => {
    const { user } = await openStart('/start-project', {
      extra: {
        'POST /api/v1/project-requests': () =>
          jsonResponse(400, {
            error: {
              code: 'VALIDATION_FAILED',
              message: 'Some details need fixing.',
              fields: { categoryKey: 'Choose a website type from the list' },
            },
          }),
      },
    });
    await fillRequired(user);

    await user.click(sendButton());

    expect(await screen.findByText('Choose a website type from the list')).toBeVisible();
    expect(await screen.findByRole('alert')).toHaveTextContent("Your project request wasn't sent");
    expect(screen.getByLabelText(/^Project name/)).toHaveValue('Website for my studio');
    expect(screen.getByLabelText(/^About your project/)).toHaveValue(description);
  });

  it('says so, and keeps what was typed, when the site is down', async () => {
    const { user } = await openStart('/start-project', {
      extra: {
        'POST /api/v1/project-requests': () =>
          jsonResponse(503, {
            error: {
              code: 'SERVICE_UNAVAILABLE',
              message: 'This part of the site is temporarily unavailable.',
            },
          }),
      },
    });
    await fillRequired(user);

    await user.click(sendButton());

    expect(await screen.findByRole('alert')).toHaveTextContent('temporarily unavailable');
    expect(screen.queryByText('Your project request has been sent')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^Project name/)).toHaveValue('Website for my studio');
    // And the button works again, so they can try once more.
    await waitFor(() => expect(sendButton()).toBeEnabled());
  });

  it('offers to try again when the lists could not be loaded', async () => {
    let calls = 0;
    const user = userEvent.setup();
    mockApi({
      ...catalogueRoutes(),
      ...signedInAs(sampleCustomer),
      'GET /api/v1/categories': () => {
        calls += 1;
        return calls === 1
          ? jsonResponse(503, {
              error: { code: 'SERVICE_UNAVAILABLE', message: 'Temporarily unavailable.' },
            })
          : jsonResponse(200, { items: sampleCategories });
      },
    });
    renderApp('/start-project');

    expect(await screen.findByRole('alert')).toHaveTextContent('Temporarily unavailable');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByLabelText(/^Project name/)).toBeVisible();
  });

  it('asks for the lists only once the person is known to be a customer', async () => {
    const { fetchMock } = await openStart('/start-project', { as: null });
    expect(requestedUrls(fetchMock).some((url) => url.includes('/categories'))).toBe(false);
  });
});

describe('Start a Project page: signing in on the way', () => {
  it('goes to the right sign-in page and returns to the form afterwards', async () => {
    const { user, router } = await openStart('/start-project', { as: null });

    await user.click(within(screen.getByRole('main')).getByRole('link', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
    expect(currentAddress(router)).toBe('/login?next=%2Fstart-project');
  });

  it('never shows a signed-in customer the sign-in prompt while the server is still being asked', async () => {
    let answer: (response: Response) => void = () => undefined;
    mockApi({
      ...catalogueRoutes(),
      'GET /api/v1/auth/me': () => new Promise<Response>((resolve) => (answer = resolve)),
    });
    renderApp('/start-project');
    await screen.findByRole('heading', { level: 1, name: 'Tell us about your project' });

    // The server hasn't answered yet: the page says it is checking, and doesn't call anyone a visitor.
    expect((await screen.findAllByText(/Checking your sign-in/)).length).toBeGreaterThan(0);
    expect(
      screen.queryByRole('heading', { name: 'Sign in to send your project' }),
    ).not.toBeInTheDocument();

    answer(jsonResponse(200, { user: sampleCustomer }));
    expect(await screen.findByLabelText(/^Project name/)).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: 'Sign in to send your project' }),
    ).not.toBeInTheDocument();
  });
});
