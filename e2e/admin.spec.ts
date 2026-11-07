import { expect, test, type Page } from '@playwright/test';
import {
  emailWithSubject,
  inDays,
  prajzoInbox,
  sendContactMessageQuietly,
  sendProjectQuietly,
  signInAsAdminQuietly,
  signInQuietly,
  signOutQuietly,
  signUpQuietly,
  uniqueEmail,
} from './helpers';

/** The "Move this project on" panel, with a status chosen. */
async function chooseMove(page: Page, label: string) {
  const panel = page.getByRole('region', { name: 'Move this project on' });
  await panel.getByLabel('Move to').selectOption({ label });
  return panel;
}

/** Makes a move that needs nothing but a click, and waits for the page to say it worked. */
async function plainMove(page: Page, label: string) {
  const panel = await chooseMove(page, label);
  await panel.getByRole('button', { name: `Move to ${label}` }).click();
  await expect(page.getByText(`Moved to ${label}`, { exact: true })).toBeVisible();
}

test.describe('a project from "Request Received" to "Completed"', () => {
  test('the administrator and the customer take it all the way, each seeing the right things', async ({
    page,
    request,
  }, testInfo) => {
    test.setTimeout(180_000);
    const email = uniqueEmail('lifecycle', testInfo.project.name);
    const privateNote = `INTERNAL-ONLY-${Math.random().toString(36).slice(2, 8)}`;

    // The customer sends a project.
    await signUpQuietly(page, email, { name: 'Asha Rao' });
    const reference = await sendProjectQuietly(page);
    const asCustomer = async () => {
      await signOutQuietly(page);
      await signInQuietly(page, email);
      await page.goto(`/account/projects/${reference}`);
      await expect(
        page.getByRole('heading', { level: 1, name: 'Website for my studio' }),
      ).toBeVisible();
    };
    const asAdmin = async () => {
      await signOutQuietly(page);
      await signInAsAdminQuietly(page);
      await page.goto(`/admin/projects/${reference}`);
      await expect(
        page.getByRole('heading', { level: 1, name: 'Website for my studio' }),
      ).toBeVisible();
    };

    // The administrator finds it in the list: new, and waiting on them.
    await signOutQuietly(page);
    await signInAsAdminQuietly(page);
    await page.goto('/admin/projects');
    await page.getByLabel('Search').fill(reference);
    await page.getByRole('button', { name: 'Search' }).click();
    const row = page.getByRole('link', { name: new RegExp(reference) });
    await expect(row).toContainText('Request Received');
    await expect(row).toContainText('Needs you');
    await row.click();
    await expect(page).toHaveURL(`/admin/projects/${reference}`);
    await expect(page.getByText('A new request', { exact: true })).toBeVisible();

    // They keep a note that only admins can ever see.
    const notes = page.getByRole('region', { name: 'Internal notes' });
    await notes.getByLabel(/^Add a note/).fill(privateNote);
    await notes.getByRole('button', { name: 'Add note' }).click();
    await expect(notes.getByText('Note added.')).toBeVisible();
    await expect(notes.getByText(privateNote)).toBeVisible();

    // Review it, then ask the customer a question.
    await plainMove(page, 'Under Review');
    const ask = await chooseMove(page, 'Awaiting Customer Information');
    await ask
      .getByLabel(/^Your question for the customer/)
      .fill('Please send your logo and brand colours.');
    await ask.getByRole('button', { name: 'Move to Awaiting Customer Information' }).click();
    await expect(page.getByText('Moved to Awaiting Customer Information')).toBeVisible();
    await expect(page.getByText('Waiting for customer', { exact: true })).toBeVisible();

    // The customer is emailed the question.
    const questionEmail = await emailWithSubject(
      request,
      email,
      `Update on your project ${reference}: Awaiting Customer Information`,
    );
    expect(questionEmail.text).toContain('Please send your logo and brand colours.');

    // The customer answers it on their project page.
    await asCustomer();
    await expect(
      page.getByRole('heading', { name: 'Prajzo needs something from you' }),
    ).toBeVisible();
    await expect(
      page.getByText('Please send your logo and brand colours.', { exact: true }),
    ).toBeVisible();
    await page
      .getByLabel(/^Your answer/)
      .fill('Logo is on WhatsApp. The colours are blue and white.');
    await page.getByRole('button', { name: 'Send answer' }).click();
    await expect(page.getByText('Your answer was sent')).toBeVisible();
    await expect(page.getByText('Your answers so far')).toBeVisible();
    await emailWithSubject(request, prajzoInbox, `${reference}: Asha Rao answered your question`);

    // The administrator sees the answer, in the list and on the project, and picks it up.
    await signOutQuietly(page);
    await signInAsAdminQuietly(page);
    await page.goto(`/admin/projects?status=awaiting-information&q=${reference}`);
    await expect(page.getByRole('link', { name: new RegExp(reference) })).toContainText(
      'Customer replied',
    );
    await page.goto('/admin');
    const todo = page.getByRole('region', { name: 'Needs you now' });
    await expect(
      todo
        .getByRole('link', { name: /Customer replies/ })
        .locator('p')
        .first(),
    ).toHaveText(/^[1-9]\d*$/);
    await page.goto(`/admin/projects/${reference}`);
    const standing = page.getByRole('region', { name: 'Where things stand' });
    await expect(standing.getByText('The customer answered your question')).toBeVisible();
    await expect(
      standing.getByText('“Logo is on WhatsApp. The colours are blue and white.”'),
    ).toBeVisible();
    await plainMove(page, 'Under Review');

    // Send a quote: the form refuses a missing price, then sends the real one.
    const quote = await chooseMove(page, 'Quote Sent');
    await quote.getByRole('button', { name: 'Send quote' }).click();
    await expect(quote.getByText('Enter the price in rupees, for example 15000')).toBeVisible();
    await quote.getByLabel(/^Price/).fill('15000');
    await quote
      .getByLabel(/^What the price includes/)
      .fill('A five-page website with a photo gallery and a contact form, ready to publish.');
    await quote.getByLabel(/^Rounds of changes included/).fill('2');
    await quote.getByRole('button', { name: 'Send quote' }).click();
    await expect(page.getByText('Moved to Quote Sent')).toBeVisible();
    const quoteEmail = await emailWithSubject(
      request,
      email,
      `Update on your project ${reference}: Quote Sent`,
    );
    expect(quoteEmail.text).toContain('Price: ₹15,000');
    expect(quoteEmail.text).toContain('Rounds of changes included: 2');

    // The customer reads the quote and accepts it, after being asked to confirm.
    await asCustomer();
    const yourQuote = page.getByRole('region', { name: 'Your quote' });
    await expect(yourQuote.getByText('₹15,000')).toBeVisible();
    await expect(yourQuote.getByText(/five-page website with a photo gallery/)).toBeVisible();
    await yourQuote.getByRole('button', { name: 'Accept this quote' }).click();
    await expect(yourQuote.getByText('Accept this quote?')).toBeVisible();
    await yourQuote.getByRole('button', { name: 'Yes, accept the quote' }).click();
    await expect(page.getByText('You accepted the quote')).toBeVisible();
    await expect(
      page
        .getByRole('region', { name: 'Your accepted quote' })
        .getByText('Accepted', { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /accept|decline/i })).toHaveCount(0);
    await emailWithSubject(request, prajzoInbox, `${reference}: Asha Rao accepted the quote`);

    // The administrator starts development: a delivery date is required, and is then confirmed.
    await asAdmin();
    await expect(page.getByText('The customer accepted the quote')).toBeVisible();
    const start = await chooseMove(page, 'In Development');
    await start.getByRole('button', { name: 'Move to In Development' }).click();
    await expect(start.getByText('Choose a date from the calendar')).toBeVisible();
    await start.getByLabel(/^Delivery date/).fill(inDays(14));
    await start.getByRole('button', { name: 'Move to In Development' }).click();
    await expect(page.getByText('Moved to In Development')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Delivery date' })).toContainText(
      'Confirmed with the customer',
    );
    await plainMove(page, 'Testing');
    await plainMove(page, 'Awaiting Customer Review');

    // The customer sees the delivery date, and asks for a change.
    await asCustomer();
    await expect(page.getByText('Delivery date:')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Your project is ready for you to review' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Ask for changes' }).click();
    await page.getByRole('button', { name: 'Send change request' }).click();
    await expect(
      page.getByText("Tell us what you'd like changed (at least 5 characters)"),
    ).toBeVisible();
    await page
      .getByLabel(/^What would you like changed/)
      .fill('Please make the logo a little bigger.');
    await page.getByRole('button', { name: 'Send change request' }).click();
    await expect(page.getByText('Your request for changes was sent')).toBeVisible();
    await expect(page.getByText("You've asked for changes.")).toBeVisible();

    // The administrator sees the change request and the rounds of changes used, and sends it back.
    await asAdmin();
    await expect(page.getByText('The customer asked for changes', { exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Rounds of changes' })).toContainText('1 of 2');
    await expect(
      page
        .getByRole('region', { name: 'Timeline' })
        .getByText('“Please make the logo a little bigger.”'),
    ).toBeVisible();
    await plainMove(page, 'In Development');
    await plainMove(page, 'Testing');
    await plainMove(page, 'Awaiting Customer Review');

    // The customer says it looks good. That does not complete the project.
    await asCustomer();
    await page.getByRole('button', { name: 'It looks good' }).click();
    await expect(page.getByText('You told us it looks good')).toBeVisible();
    await expect(page.getByText('Awaiting Customer Review').first()).toBeVisible();
    await emailWithSubject(request, prajzoInbox, `${reference}: Asha Rao says it looks good`);

    // The administrator is told it is their turn, and completes it (a final move asks for a tick).
    await asAdmin();
    await expect(page.getByText('The customer said it looks good', { exact: true })).toBeVisible();
    await page.goto('/admin');
    await expect(
      page
        .getByRole('region', { name: 'Needs you now' })
        .getByRole('link', { name: /Said it looks good/ })
        .locator('p')
        .first(),
    ).toHaveText(/^[1-9]\d*$/);
    await page.goto(`/admin/projects/${reference}`);
    const finish = await chooseMove(page, 'Completed');
    const complete = finish.getByRole('button', { name: 'Move to Completed' });
    await expect(complete).toBeDisabled();
    await finish.getByRole('checkbox', { name: /I understand that “Completed” is final/ }).check();
    await complete.click();
    await expect(page.getByText('Moved to Completed')).toBeVisible();
    await expect(
      page
        .getByRole('region', { name: 'Move this project on' })
        .getByText(/can't be changed any more/),
    ).toBeVisible();

    // The customer sees a finished project with its whole story, and nothing private.
    await asCustomer();
    await expect(page.getByText('Your project is complete.')).toBeVisible();
    const timeline = page.getByRole('region', { name: 'Timeline' });
    for (const step of [
      'Request Received',
      'Under Review',
      'Awaiting Customer Information',
      'Quote Sent',
      'Approved',
      'In Development',
      'Testing',
      'Awaiting Customer Review',
      'Revision Requested',
      'Completed',
    ]) {
      await expect(timeline.getByText(step, { exact: true }).first()).toBeVisible();
    }
    await expect(timeline.getByText('You said the project looks good')).toBeVisible();
    await expect(page.getByText('1 of 2 included')).toBeVisible();
    await expect(page.getByText(privateNote)).toHaveCount(0);
    const raw = await (await page.request.get(`/api/v1/project-requests/${reference}`)).text();
    expect(raw).not.toContain(privateNote);
    expect(raw).not.toContain('adminNotes');
    const emails = (await (await request.get(`/api/__e2e/emails?to=${email}`)).json()) as {
      text: string;
    }[];
    expect(emails.length).toBeGreaterThan(5);
    expect(emails.some((mail) => mail.text.includes(privateNote))).toBe(false);
  });
});

test.describe('who may use the administration area', () => {
  test('a signed-out visitor is sent to the admin sign-in, and the API refuses them', async ({
    page,
  }) => {
    for (const path of [
      '/admin/projects',
      '/admin/customers',
      '/admin/messages',
      '/admin/catalogue',
    ]) {
      await page.goto(path);
      await expect(page).toHaveURL('/admin/login');
    }
    for (const path of [
      '/api/v1/admin/overview',
      '/api/v1/admin/project-requests',
      '/api/v1/admin/customers',
      '/api/v1/admin/contact-messages',
      '/api/v1/admin/activity',
      '/api/v1/admin/categories',
      '/api/v1/admin/packages',
    ]) {
      expect((await page.request.get(path)).status(), path).toBe(401);
    }
  });

  test("a customer is turned away, and cannot change anyone's project, even their own", async ({
    page,
  }, testInfo) => {
    await signUpQuietly(page, uniqueEmail('turned-away', testInfo.project.name));
    const reference = await sendProjectQuietly(page);

    await page.goto('/admin/projects');
    await expect(
      page.getByRole('heading', { name: "You don't have access to this page" }),
    ).toBeVisible();
    await page.goto(`/admin/projects/${reference}`);
    await expect(
      page.getByRole('heading', { name: "You don't have access to this page" }),
    ).toBeVisible();

    expect((await page.request.get('/api/v1/admin/project-requests')).status()).toBe(403);
    expect((await page.request.get(`/api/v1/admin/project-requests/${reference}`)).status()).toBe(
      403,
    );
    expect((await page.request.get('/api/v1/admin/customers')).status()).toBe(403);
    expect((await page.request.get('/api/v1/admin/contact-messages')).status()).toBe(403);
    expect(
      (
        await page.request.post(`/api/v1/admin/project-requests/${reference}/status`, {
          data: { to: 'under-review' },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await page.request.post(`/api/v1/admin/project-requests/${reference}/notes`, {
          data: { text: 'sneaky' },
        })
      ).status(),
    ).toBe(403);

    // The project is exactly as it was.
    const project = (await (
      await page.request.get(`/api/v1/project-requests/${reference}`)
    ).json()) as {
      project: { status: string };
    };
    expect(project.project.status).toBe('received');
  });
});

test.describe('two people working on one project', () => {
  test('a page that is out of date says why nothing changed, and shows the project as it is now', async ({
    page,
  }, testInfo) => {
    // A customer registers and sends a project, then an administrator works on it from two pages
    // at once: too many steps for the 30-second default under a full parallel run.
    test.setTimeout(120_000);
    await signUpQuietly(page, uniqueEmail('stale', testInfo.project.name));
    const reference = await sendProjectQuietly(page);
    await signOutQuietly(page);
    await signInAsAdminQuietly(page);

    // Two pages are open on the same project, both showing "Request Received". The first load of
    // an administration page pulls a few hundred separate modules from the development server
    // (there is no bundle in these tests), which takes well over the usual ten seconds when the
    // whole suite is running at once, so both pages are given longer to appear.
    const slowFirstLoad = { timeout: 60_000 };
    const other = await page.context().newPage();
    await other.goto(`/admin/projects/${reference}`);
    await expect(
      other.getByRole('heading', { level: 1, name: 'Website for my studio' }),
    ).toBeVisible(slowFirstLoad);
    await page.goto(`/admin/projects/${reference}`);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Website for my studio' }),
    ).toBeVisible(slowFirstLoad);

    // One moves it on...
    await plainMove(other, 'Under Review');

    // ...so the other, which still shows the old state, is told, and shown the new one.
    const stale = await chooseMove(page, 'Under Review');
    await stale.getByRole('button', { name: 'Move to Under Review' }).click();
    await expect(page.getByText('The project has changed')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Where things stand' })).toContainText(
      'Waiting for you',
    );
    await expect(
      page.getByRole('region', { name: 'Move this project on' }).getByLabel('Move to'),
    ).toContainText('Quote Sent');
    await other.close();
  });
});

/** The card for a message in the inbox (not the list items inside the card). */
const messageCard = (page: Page, name: string) =>
  page.locator('ul[aria-label="Messages"] > li').filter({ hasText: name });

test.describe('messages from the contact form', () => {
  test('are read, archived and answered from the inbox, and stay that way after a reload', async ({
    page,
    request,
  }, testInfo) => {
    const name = `Visitor ${testInfo.project.name} ${Math.random().toString(36).slice(2, 7)}`;
    await sendContactMessageQuietly(request, name);
    await signInAsAdminQuietly(page);

    await page.goto(`/admin/messages?status=new&q=${encodeURIComponent(name)}`);
    const message = messageCard(page, name);
    await expect(message).toBeVisible();
    await expect(message.getByText('New', { exact: true })).toBeVisible();
    await expect(message.getByText(/I would like a website for my shop/)).toBeVisible();
    await expect(message.getByRole('link', { name: /Reply by email/ })).toHaveAttribute(
      'href',
      /^mailto:visitor@example\.com\?subject=/,
    );

    await message.getByRole('button', { name: 'Mark as read' }).click();
    await expect(message.getByText('Marked as read.')).toBeVisible();

    // It is really read: the New folder no longer has it, the Read folder does.
    await page.goto(`/admin/messages?status=new&q=${encodeURIComponent(name)}`);
    await expect(page.getByRole('heading', { name: 'No messages match' })).toBeVisible();
    await page.goto(`/admin/messages?status=read&q=${encodeURIComponent(name)}`);
    await expect(messageCard(page, name)).toBeVisible();

    await messageCard(page, name).getByRole('button', { name: 'Archive' }).click();
    await expect(page.getByText('Archived.')).toBeVisible();
    await page.goto(`/admin/messages?status=archived&q=${encodeURIComponent(name)}`);
    await expect(messageCard(page, name)).toBeVisible();
    await page.goto(`/admin/messages?status=inbox&q=${encodeURIComponent(name)}`);
    await expect(page.getByRole('heading', { name: 'No messages match' })).toBeVisible();
  });
});

test.describe('the catalogue', () => {
  test('a hidden package and website type can be added and edited without touching the public site', async ({
    page,
  }, testInfo) => {
    const suffix = Math.random().toString(36).slice(2, 8);
    const packageKey = `e2e-${testInfo.project.name}-${suffix}`;
    await signInAsAdminQuietly(page);

    // Add a package that visitors cannot see yet.
    await page.goto('/admin/catalogue/packages/new');
    await page.getByLabel(/^Key/).fill(packageKey);
    await page.getByLabel(/^Name/).fill(`E2E Package ${suffix}`);
    await page.getByLabel(/^Summary/).fill('A package made by the end-to-end test.');
    await page.getByLabel(/^What it includes/).fill('Line one\nLine two');
    await page.getByLabel(/^How quickly/).selectOption('professional');
    await page.getByLabel(/^How the price is shown/).selectOption('from');
    await page.getByLabel(/^Price/).fill('4999');
    await page.getByLabel(/^Display order/).fill('900');
    await page.getByLabel('Show on the website').uncheck();
    await page.getByRole('button', { name: 'Add package' }).click();

    await expect(page).toHaveURL('/admin/catalogue');
    await expect(page.getByText(`“E2E Package ${suffix}” was added.`)).toBeVisible();
    const row = page.getByRole('listitem').filter({ hasText: packageKey });
    await expect(row).toContainText('Starting from: ₹4,999');
    await expect(row).toContainText('Hidden');

    // Change its price.
    await row.getByRole('link', { name: /^Edit/ }).click();
    await expect(page.getByLabel(/^Price/)).toHaveValue('4999');
    await page.getByLabel(/^Price/).fill('5499');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText(`“E2E Package ${suffix}” was saved.`)).toBeVisible();
    await expect(page.getByRole('listitem').filter({ hasText: packageKey })).toContainText(
      'Starting from: ₹5,499',
    );

    // A price that cannot be right is refused with a reason, and nothing changes.
    await page
      .getByRole('listitem')
      .filter({ hasText: packageKey })
      .getByRole('link', { name: /^Edit/ })
      .click();
    await page.getByLabel(/^Price/).fill('0.50');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Enter the price, at least ₹1')).toBeVisible();

    // Visitors never see it, in the API or on the Pricing page.
    const publicPackages = (await (await page.request.get('/api/v1/packages')).json()) as {
      items: { key: string }[];
    };
    expect(publicPackages.items.map((item) => item.key)).not.toContain(packageKey);
    await page.goto('/pricing');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText(`E2E Package ${suffix}`)).toHaveCount(0);

    // A new website type, hidden too.
    const categoryKey = `e2e-type-${testInfo.project.name}-${suffix}`;
    await page.goto('/admin/catalogue/categories/new');
    await page.getByLabel(/^Key/).fill(categoryKey);
    await page.getByLabel(/^Title/).fill(`E2E Type ${suffix}`);
    await page.getByLabel(/^Description/).fill('A website type made by the end-to-end test.');
    await page.getByLabel(/^Icon/).selectOption('Wrench');
    await page.getByLabel(/^Examples/).fill('First example\nSecond example');
    await page.getByLabel(/^How quickly/).selectOption('quick');
    await page.getByLabel(/^Display order/).fill('900');
    await page.getByLabel('Show on the website').uncheck();
    await page.getByRole('button', { name: 'Add website type' }).click();
    await expect(page.getByText(`“E2E Type ${suffix}” was added.`)).toBeVisible();
    await expect(page.getByRole('listitem').filter({ hasText: categoryKey })).toContainText(
      'Hidden',
    );
  });

  test('refuses a key that is already used, and says so beside the key', async ({ page }) => {
    await signInAsAdminQuietly(page);
    await page.goto('/admin/catalogue/categories/new');
    await page.getByLabel(/^Key/).fill('business-websites');
    await page.getByLabel(/^Title/).fill('Duplicate');
    await page.getByLabel(/^Description/).fill('This key already exists in the catalogue.');
    await page.getByLabel(/^Icon/).selectOption('Wrench');
    await page.getByLabel(/^How quickly/).selectOption('quick');
    await page.getByLabel(/^Display order/).fill('901');
    await page.getByRole('button', { name: 'Add website type' }).click();

    await expect(page.getByRole('alert')).toContainText("This wasn't saved");
    await expect(page).toHaveURL('/admin/catalogue/categories/new');
    await expect(page.getByLabel(/^Title/)).toHaveValue('Duplicate');
  });
});

test.describe('customers and activity', () => {
  test('a customer is listed with their projects, and what they did is in the activity log', async ({
    page,
  }, testInfo) => {
    const email = uniqueEmail('listed', testInfo.project.name);
    await signUpQuietly(page, email, { name: 'Listed Customer' });
    const reference = await sendProjectQuietly(page);
    await signOutQuietly(page);
    await signInAsAdminQuietly(page);

    await page.goto(`/admin/customers?q=${encodeURIComponent(email)}`);
    const customer = page.getByRole('link', { name: /Listed Customer/ });
    await expect(customer).toContainText('1 project');
    await customer.click();
    await expect(page.getByRole('heading', { level: 1, name: 'Listed Customer' })).toBeVisible();
    await expect(page.getByRole('link', { name: email })).toHaveAttribute(
      'href',
      `mailto:${email}`,
    );
    await page.getByRole('link', { name: /Website for my studio/ }).click();
    await expect(page).toHaveURL(`/admin/projects/${reference}`);

    // The customer's own action is recorded, with who did it.
    await plainMove(page, 'Under Review');
    await page.goto('/admin/activity?type=project');
    await expect(page.getByRole('heading', { level: 1, name: 'Activity' })).toBeVisible();
    await expect(page.locator(`a[href="/admin/projects/${reference}"]`).first()).toBeVisible();
    const activity = (await (
      await page.request.get('/api/v1/admin/activity?targetType=project&limit=50')
    ).json()) as {
      items: { targetId: string; actorRole: string; summary: string }[];
    };
    const ours = activity.items.filter((item) => item.targetId === reference);
    expect(ours.map((item) => item.actorRole).sort()).toEqual(['admin', 'customer']);
    expect(ours.every((item) => item.summary.length > 0)).toBe(true);
  });
});
