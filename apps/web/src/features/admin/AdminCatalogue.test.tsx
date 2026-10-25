import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  catalogueRoutes,
  jsonBody,
  jsonResponse,
  mockApi,
  sampleAdmin,
  sampleAdminCategory,
  sampleAdminPackage,
  signedInAs,
} from '../../test/mock-api';
import { currentAddress, renderApp } from '../../test/render-app';

type Routes = Parameters<typeof mockApi>[0];
const categoriesUrl = 'GET /api/v1/admin/categories';
const packagesUrl = 'GET /api/v1/admin/packages';

const categories = [
  sampleAdminCategory(),
  sampleAdminCategory({
    key: 'personal-portfolio',
    title: 'Personal Portfolio Websites',
    icon: 'UserRound',
    deliveryTier: 'quick',
    sortOrder: 20,
    active: false,
  }),
];
const packages = [
  sampleAdminPackage({
    key: 'quick-launch',
    name: 'Quick Launch',
    priceMode: 'from',
    priceAmountPaise: 299_900,
  }),
  sampleAdminPackage({
    key: 'custom-build',
    name: 'Custom Build',
    priceMode: 'quote',
    priceAmountPaise: null,
  }),
  sampleAdminPackage({
    key: 'advanced',
    name: 'Advanced Development',
    priceMode: 'fixed',
    priceAmountPaise: 1_999_900,
    active: false,
  }),
];

function open(path: string, extra: Routes = {}) {
  const fetchMock = mockApi({
    ...catalogueRoutes(),
    ...signedInAs(sampleAdmin),
    [categoriesUrl]: () => jsonResponse(200, { items: categories }),
    [packagesUrl]: () => jsonResponse(200, { items: packages }),
    ...extra,
  });
  const user = userEvent.setup();
  const router = renderApp(path);
  return { fetchMock, user, router };
}

const serviceDown = () =>
  jsonResponse(503, {
    error: {
      code: 'SERVICE_UNAVAILABLE',
      message: 'This part of the site is temporarily unavailable.',
    },
  });

describe('the catalogue', () => {
  it('lists the website types with their key, delivery speed and whether they are hidden', async () => {
    open('/admin/catalogue');

    const list = within(await screen.findByRole('list', { name: 'Website types' }));
    const rows = list.getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]!).getByText('Business Websites', { selector: 'p' })).toBeVisible();
    expect(within(rows[0]!).getByText('business-websites')).toBeVisible();
    expect(within(rows[0]!).getByText('Professional Website')).toBeVisible();
    expect(within(rows[0]!).queryByText('Hidden')).not.toBeInTheDocument();
    expect(within(rows[0]!).getByRole('link', { name: 'Edit Business Websites' })).toHaveAttribute(
      'href',
      '/admin/catalogue/categories/business-websites',
    );
    expect(within(rows[1]!).getByText('Hidden')).toBeVisible();
  });

  it('lists the packages with their prices, the way visitors see them', async () => {
    open('/admin/catalogue');

    const list = within(await screen.findByRole('list', { name: 'Packages' }));
    const rows = list.getAllByRole('listitem');
    expect(rows).toHaveLength(3);
    expect(within(rows[0]!).getByText('Starting from: ₹2,999')).toBeVisible();
    expect(within(rows[1]!).getByText('Request a quote')).toBeVisible();
    expect(within(rows[2]!).getByText('Price: ₹19,999')).toBeVisible();
    expect(within(rows[2]!).getByText('Hidden')).toBeVisible();
    expect(within(rows[0]!).getByRole('link', { name: 'Edit Quick Launch' })).toHaveAttribute(
      'href',
      '/admin/catalogue/packages/quick-launch',
    );
  });

  it('offers to add a website type and a package', async () => {
    open('/admin/catalogue');
    expect(await screen.findByRole('link', { name: /Add a website type/ })).toHaveAttribute(
      'href',
      '/admin/catalogue/categories/new',
    );
    expect(screen.getByRole('link', { name: /Add a package/ })).toHaveAttribute(
      'href',
      '/admin/catalogue/packages/new',
    );
  });

  it('says how long a change takes to reach the website, truthfully', async () => {
    open('/admin/catalogue');
    expect(await screen.findByText(/within about a minute/)).toBeVisible();
  });

  it('shows the packages even when the website types cannot be loaded, and retries only that part', async () => {
    let calls = 0;
    const { user } = open('/admin/catalogue', {
      [categoriesUrl]: () => {
        calls += 1;
        return calls === 1 ? serviceDown() : jsonResponse(200, { items: categories });
      },
    });

    const failed = await screen.findByRole('alert');
    expect(failed).toHaveTextContent('temporarily unavailable');
    expect(await screen.findByRole('list', { name: 'Packages' })).toBeVisible();
    expect(screen.queryByRole('list', { name: 'Website types' })).not.toBeInTheDocument();

    await user.click(within(failed).getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('list', { name: 'Website types' })).toBeVisible();
    expect(screen.getByRole('list', { name: 'Packages' })).toBeVisible();
  });

  it('says so when there is nothing yet', async () => {
    open('/admin/catalogue', {
      [categoriesUrl]: () => jsonResponse(200, { items: [] }),
      [packagesUrl]: () => jsonResponse(200, { items: [] }),
    });
    expect(await screen.findByRole('heading', { name: 'No website types yet' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'No packages yet' })).toBeVisible();
  });
});

describe('adding and editing a website type', () => {
  const create = '/admin/catalogue/categories/new';
  const field = (name: RegExp | string) => screen.getByLabelText(name);

  it('asks for every field, all at once, and sends nothing while any is missing', async () => {
    const { fetchMock, user } = open(create);
    await screen.findByRole('heading', { level: 1, name: 'Add a website type' });

    await user.click(screen.getByRole('button', { name: 'Add website type' }));

    expect(await screen.findByText('Use at least 3 characters')).toBeVisible();
    expect(screen.getByText('Enter a title (at least 2 characters)')).toBeVisible();
    expect(screen.getByText('Describe it in a sentence (at least 10 characters)')).toBeVisible();
    expect(screen.getByText('Choose an icon from the list')).toBeVisible();
    expect(
      screen.getByText('Choose how quickly this kind of project is usually done'),
    ).toBeVisible();
    expect(screen.getByText('Enter a whole number, 0 or more')).toBeVisible();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
  });

  it('explains what the chosen delivery speed means, without a long dropdown', async () => {
    const { user } = open(create);
    await screen.findByRole('heading', { level: 1, name: 'Add a website type' });
    expect(screen.getByText('Choose how quickly this is usually delivered.')).toBeVisible();

    await user.selectOptions(field(/^How quickly/), 'advanced');

    expect(screen.getByText('Target: within 7 days. Targets are not guarantees.')).toBeVisible();
    expect(
      within(field(/^How quickly/))
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual([
      'Choose…',
      'Quick Launch',
      'Professional Website',
      'Advanced Development',
      'Custom project',
    ]);
  });

  it('refuses a key that breaks the rules, and more examples than are allowed', async () => {
    const { user } = open(create);
    await screen.findByRole('heading', { level: 1, name: 'Add a website type' });
    await user.type(field(/^Key/), 'Online Shop');
    await user.type(
      field(/^Examples/),
      Array.from({ length: 9 }, (_, i) => `Example ${i}`).join('{Enter}'),
    );

    await user.click(screen.getByRole('button', { name: 'Add website type' }));

    expect(
      await screen.findByText(
        'Use lower-case letters and numbers, joined by dashes (for example "online-shop")',
      ),
    ).toBeVisible();
    expect(screen.getByText('Keep it to 8 examples')).toBeVisible();
  });

  it('adds a website type, then returns to the catalogue and says it was added', async () => {
    let sent: unknown;
    const { user, router } = open(create, {
      'POST /api/v1/admin/categories': (init) => {
        sent = jsonBody(init);
        return jsonResponse(201, {
          category: sampleAdminCategory({ key: 'online-shop', title: 'Online Shops' }),
        });
      },
    });
    await screen.findByRole('heading', { level: 1, name: 'Add a website type' });
    await user.type(field(/^Key/), 'online-shop');
    await user.type(field(/^Title/), 'Online Shops');
    await user.type(field(/^Description/), 'Shops that sell online, with a cart.');
    await user.selectOptions(field(/^Icon/), 'ShoppingBag');
    await user.type(field(/^Examples/), 'Small shops{Enter}{Enter}  Boutiques  ');
    await user.selectOptions(field(/^How quickly/), 'advanced');
    await user.type(field(/^Display order/), '40');

    await user.click(screen.getByRole('button', { name: 'Add website type' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Catalogue' })).toBeVisible();
    expect(sent).toEqual({
      key: 'online-shop',
      title: 'Online Shops',
      description: 'Shops that sell online, with a cart.',
      icon: 'ShoppingBag',
      useCases: ['Small shops', 'Boutiques'],
      deliveryTier: 'advanced',
      sortOrder: 40,
      active: true,
    });
    expect(currentAddress(router)).toBe('/admin/catalogue');
    expect(await screen.findByText('“Online Shops” was added.')).toBeVisible();
  });

  it("shows the server's reason beside the key when it is already taken", async () => {
    const { user } = open(create, {
      'POST /api/v1/admin/categories': () =>
        jsonResponse(409, {
          error: {
            code: 'CONFLICT',
            message: 'That key is already used.',
            fields: { key: 'A website type with this key already exists.' },
          },
        }),
    });
    await screen.findByRole('heading', { level: 1, name: 'Add a website type' });
    await user.type(field(/^Key/), 'online-shop');
    await user.type(field(/^Title/), 'Online Shops');
    await user.type(field(/^Description/), 'Shops that sell online, with a cart.');
    await user.selectOptions(field(/^Icon/), 'ShoppingBag');
    await user.selectOptions(field(/^How quickly/), 'advanced');
    await user.type(field(/^Display order/), '40');

    await user.click(screen.getByRole('button', { name: 'Add website type' }));

    expect(await screen.findByText('A website type with this key already exists.')).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent("This wasn't saved");
    expect(field(/^Title/)).toHaveValue('Online Shops'); // nothing typed is lost
  });

  it('shows an existing website type to edit, with its key fixed', async () => {
    open('/admin/catalogue/categories/business-websites');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Edit Business Websites' }),
    ).toBeVisible();
    expect(screen.getByText('business-websites')).toBeVisible();
    expect(screen.queryByLabelText(/^Key/)).not.toBeInTheDocument();
    expect(field(/^Title/)).toHaveValue('Business Websites');
    expect(field(/^Description/)).toHaveValue('Clear, fast websites that explain what you do.');
    expect(field(/^Icon/)).toHaveValue('Building2');
    expect(field(/^Examples/)).toHaveValue('Shops and local services');
    expect(field(/^How quickly/)).toHaveValue('professional');
    expect(field(/^Display order/)).toHaveValue('10');
    expect(field('Show on the website')).toBeChecked();
  });

  it('saves changes without sending the key, and can hide a website type', async () => {
    let sent: unknown;
    const { user } = open('/admin/catalogue/categories/business-websites', {
      'PATCH /api/v1/admin/categories/business-websites': (init) => {
        sent = jsonBody(init);
        return jsonResponse(200, { category: sampleAdminCategory({ title: 'Business Sites' }) });
      },
    });
    await screen.findByRole('heading', { level: 1, name: 'Edit Business Websites' });
    await user.clear(field(/^Title/));
    await user.type(field(/^Title/), 'Business Sites');
    await user.click(field('Show on the website'));

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('“Business Sites” was saved.')).toBeVisible();
    expect(sent).toEqual({
      title: 'Business Sites',
      description: 'Clear, fast websites that explain what you do.',
      icon: 'Building2',
      useCases: ['Shops and local services'],
      deliveryTier: 'professional',
      sortOrder: 10,
      active: false,
    });
  });

  it('does not check an existing key against the rules for new ones', async () => {
    const { user } = open('/admin/catalogue/categories/cv', {
      [categoriesUrl]: () =>
        jsonResponse(200, { items: [sampleAdminCategory({ key: 'cv', title: 'CV sites' })] }),
      'PATCH /api/v1/admin/categories/cv': () =>
        jsonResponse(200, { category: sampleAdminCategory({ key: 'cv', title: 'CV sites' }) }),
    });
    await screen.findByRole('heading', { level: 1, name: 'Edit CV sites' });

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('“CV sites” was saved.')).toBeVisible();
  });

  it('says so when the website type does not exist', async () => {
    open('/admin/catalogue/categories/nothing-here');
    expect(
      await screen.findByRole('heading', { level: 1, name: "We couldn't find that website type" }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Back to the catalogue' })).toBeVisible();
  });

  it('says so, and tries again on request, when the website type cannot be loaded', async () => {
    let calls = 0;
    const { user } = open('/admin/catalogue/categories/business-websites', {
      [categoriesUrl]: () => {
        calls += 1;
        return calls === 1 ? serviceDown() : jsonResponse(200, { items: categories });
      },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('temporarily unavailable');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Edit Business Websites' }),
    ).toBeVisible();
  });
});

describe('adding and editing a package', () => {
  const create = '/admin/catalogue/packages/new';
  const field = (name: RegExp | string) => screen.getByLabelText(name);

  async function fillBasics(user: ReturnType<typeof userEvent.setup>) {
    await screen.findByRole('heading', { level: 1, name: 'Add a package' });
    await user.type(field(/^Key/), 'business-plus');
    await user.type(field(/^Name/), 'Business Plus');
    await user.type(field(/^Summary/), 'A bigger website with a blog and bookings.');
    await user.type(field(/^What it includes/), 'Blog{Enter}Bookings{Enter}Gallery');
    await user.selectOptions(field(/^How quickly/), 'advanced');
    await user.type(field(/^Display order/), '30');
  }

  it('asks for every field, all at once, and sends nothing while any is missing', async () => {
    const { fetchMock, user } = open(create);
    await screen.findByRole('heading', { level: 1, name: 'Add a package' });

    await user.click(screen.getByRole('button', { name: 'Add package' }));

    expect(await screen.findByText('Use at least 3 characters')).toBeVisible();
    expect(screen.getByText('Enter a name (at least 2 characters)')).toBeVisible();
    expect(screen.getByText('Describe it in a sentence (at least 10 characters)')).toBeVisible();
    expect(screen.getByText('Choose how quickly this package is usually delivered')).toBeVisible();
    expect(screen.getByText('Choose how the price is shown')).toBeVisible();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
  });

  it('wants a price unless the package is shown as "Request a quote"', async () => {
    const { user } = open(create);
    await fillBasics(user);

    await user.selectOptions(field(/^How the price is shown/), 'from');
    await user.click(screen.getByRole('button', { name: 'Add package' }));
    expect(await screen.findByText('Enter the price')).toBeVisible();

    await user.selectOptions(field(/^How the price is shown/), 'quote');
    await user.type(field(/^Price/), '5000');
    await user.click(screen.getByRole('button', { name: 'Add package' }));
    expect(
      await screen.findByText('Leave the price empty when it is shown as "Request a quote"'),
    ).toBeVisible();
  });

  it('explains what visitors will see for each way of showing the price', async () => {
    const { user } = open(create);
    await screen.findByRole('heading', { level: 1, name: 'Add a package' });
    expect(
      within(field(/^How the price is shown/))
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Choose…', 'Request a quote', 'Starting from', 'Fixed price']);

    await user.selectOptions(field(/^How the price is shown/), 'quote');
    expect(screen.getByText('Visitors see “Request a quote”, with no price.')).toBeVisible();
    await user.selectOptions(field(/^How the price is shown/), 'from');
    expect(screen.getByText('Visitors see “Starting from” and the price.')).toBeVisible();
    await user.selectOptions(field(/^How the price is shown/), 'fixed');
    expect(screen.getByText('Visitors see the price.')).toBeVisible();
  });

  it('changes what the price box says to match how the price is shown', async () => {
    const { user } = open(create);
    await screen.findByRole('heading', { level: 1, name: 'Add a package' });

    await user.selectOptions(field(/^How the price is shown/), 'quote');
    expect(screen.getByText('Leave empty. Visitors see “Request a quote”.')).toBeVisible();

    await user.selectOptions(field(/^How the price is shown/), 'fixed');
    expect(screen.getByText('In rupees, for example 7999.')).toBeVisible();
  });

  it.each([
    ['0.50', 'Enter the price, at least ₹1'],
    ['12.5.5', 'Enter the price in rupees, for example 15000'],
    ['2999.50', 'Enter a whole number of rupees'],
  ])('refuses the price "%s"', async (typed, message) => {
    const { user } = open(create);
    await fillBasics(user);
    await user.selectOptions(field(/^How the price is shown/), 'fixed');
    await user.type(field(/^Price/), typed);

    await user.click(screen.getByRole('button', { name: 'Add package' }));

    expect(await screen.findByText(message)).toBeVisible();
  });

  it('adds a package, sending the price in paise, and says it was added', async () => {
    let sent: unknown;
    const { user } = open(create, {
      'POST /api/v1/admin/packages': (init) => {
        sent = jsonBody(init);
        return jsonResponse(201, {
          package: sampleAdminPackage({ key: 'business-plus', name: 'Business Plus' }),
        });
      },
    });
    await fillBasics(user);
    await user.selectOptions(field(/^How the price is shown/), 'from');
    await user.type(field(/^Price/), '9999');

    await user.click(screen.getByRole('button', { name: 'Add package' }));

    expect(await screen.findByText('“Business Plus” was added.')).toBeVisible();
    expect(sent).toEqual({
      key: 'business-plus',
      name: 'Business Plus',
      summary: 'A bigger website with a blog and bookings.',
      deliveryTier: 'advanced',
      scope: ['Blog', 'Bookings', 'Gallery'],
      priceMode: 'from',
      priceAmountPaise: 999_900,
      sortOrder: 30,
      active: true,
    });
  });

  it('adds a "Request a quote" package with no price at all', async () => {
    let sent: { priceAmountPaise?: unknown; priceMode?: unknown } | undefined;
    const { user } = open(create, {
      'POST /api/v1/admin/packages': (init) => {
        sent = jsonBody(init) as typeof sent;
        return jsonResponse(201, { package: sampleAdminPackage() });
      },
    });
    await fillBasics(user);
    await user.selectOptions(field(/^How the price is shown/), 'quote');

    await user.click(screen.getByRole('button', { name: 'Add package' }));

    await screen.findByRole('heading', { level: 1, name: 'Catalogue' });
    expect(sent?.priceMode).toBe('quote');
    expect(sent?.priceAmountPaise).toBeNull();
  });

  it('shows an existing package to edit, with its price in rupees', async () => {
    open('/admin/catalogue/packages/quick-launch');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Edit Quick Launch' }),
    ).toBeVisible();
    expect(screen.getByText('quick-launch')).toBeVisible();
    expect(field(/^Name/)).toHaveValue('Quick Launch');
    expect(field(/^What it includes/)).toHaveValue('Small business websites');
    expect(field(/^How the price is shown/)).toHaveValue('from');
    expect(field(/^Price/)).toHaveValue('2999');
    expect(field(/^Display order/)).toHaveValue('20');
  });

  it('saves a new price, without sending the key', async () => {
    let sent: unknown;
    const { user } = open('/admin/catalogue/packages/quick-launch', {
      'PATCH /api/v1/admin/packages/quick-launch': (init) => {
        sent = jsonBody(init);
        return jsonResponse(200, { package: packages[0] });
      },
    });
    await screen.findByRole('heading', { level: 1, name: 'Edit Quick Launch' });
    await user.clear(field(/^Price/));
    await user.type(field(/^Price/), '3499');

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('“Quick Launch” was saved.')).toBeVisible();
    expect(sent).toMatchObject({ priceMode: 'from', priceAmountPaise: 349_900 });
    expect(sent).not.toHaveProperty('key');
  });

  it("shows the server's reason beside the price when it still refuses", async () => {
    const { user } = open('/admin/catalogue/packages/quick-launch', {
      'PATCH /api/v1/admin/packages/quick-launch': () =>
        jsonResponse(400, {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Please check what you entered.',
            fields: { priceAmountPaise: 'Enter the price, at least ₹1' },
          },
        }),
    });
    await screen.findByRole('heading', { level: 1, name: 'Edit Quick Launch' });

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Enter the price, at least ₹1')).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent("This wasn't saved");
  });

  it('says so when the package does not exist', async () => {
    open('/admin/catalogue/packages/nothing-here');
    expect(
      await screen.findByRole('heading', { level: 1, name: "We couldn't find that package" }),
    ).toBeVisible();
  });
});
