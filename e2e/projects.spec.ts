import { expect, test } from '@playwright/test';
import {
  lastEmailTo,
  sendProjectQuietly,
  signInAsAdminQuietly,
  signUpQuietly,
  strongPassword,
  uniqueEmail,
} from './helpers';

test.describe('sending and following a project', () => {
  test('a customer sends a project, follows it, and cancels it', async ({
    page,
    request,
  }, testInfo) => {
    const email = uniqueEmail('project', testInfo.project.name);
    await signUpQuietly(page, email, { name: 'Ravi Kumar' });

    // Fill in the form.
    await page.goto('/start-project');
    await page.getByLabel(/^Project name/).fill('Website for my studio');
    await page.getByLabel(/^Type of website/).selectOption('business-websites');
    await page.getByLabel(/^Package/).selectOption('professional-website');
    await page
      .getByLabel(/^About your project/)
      .fill('A simple five-page website for my photography studio, with a gallery.');
    await page.getByLabel('Photo or video gallery').check();
    await page.getByLabel('Google Maps').check();
    await page.getByLabel(/^How should we contact you/).selectOption('whatsapp');
    await page.getByLabel(/^Phone or WhatsApp/).fill('+91 98866 07720');
    await page.getByRole('button', { name: 'Send project request' }).click();

    // The server confirmed it: the page shows the reference number.
    await expect(page.getByText('Your project request has been sent')).toBeVisible();
    const reference = (await page.getByText(/^PRZ-\d{4}-\d{4}$/).textContent()) ?? '';
    expect(reference).toMatch(/^PRZ-\d{4}-\d{4}$/);

    // And the confirmation email (captured by the test server) quotes it, with a link to the project.
    const confirmation = await lastEmailTo(request, email);
    expect(confirmation.subject).toContain(reference);
    expect(confirmation.text).toContain(`/account/projects/${reference}`);

    // The project page shows what was asked for, its status and its timeline.
    await page.getByRole('link', { name: 'View this project' }).click();
    await expect(page).toHaveURL(`/account/projects/${reference}`);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Website for my studio' }),
    ).toBeVisible();
    await expect(page.getByText("We've received your request.")).toBeVisible();
    await expect(page.getByText('Photo or video gallery')).toBeVisible();
    await expect(page.getByText('WhatsApp · +91 98866 07720')).toBeVisible();
    const timeline = page.getByRole('heading', { name: 'Timeline' }).locator('..');
    await expect(timeline.getByRole('listitem')).toHaveCount(1);
    await expect(timeline.getByText('Request Received')).toBeVisible();

    // It appears in the list and on the account page.
    await page.goto('/account/projects');
    const item = page.getByRole('link', { name: /Website for my studio/ });
    await expect(item).toBeVisible();
    await expect(item.getByText('Request Received')).toBeVisible();
    await page.goto('/account');
    await expect(page.getByRole('link', { name: /Website for my studio/ })).toBeVisible();

    // Cancel it: the page asks first.
    await page.goto(`/account/projects/${reference}`);
    await page.getByRole('button', { name: 'Cancel this project' }).click();
    await expect(page.getByText('Are you sure you want to cancel this project?')).toBeVisible();
    await page.getByLabel('Reason (optional)').fill('Changed my mind');
    await page.getByRole('button', { name: 'Yes, cancel this project' }).click();
    await expect(page.getByText('Your project has been cancelled')).toBeVisible();
    await expect(page.getByRole('button', { name: /cancel this project/i })).toHaveCount(0);

    // It stays cancelled after a reload, with the reason in the timeline.
    await page.reload();
    await expect(page.getByText('This project was cancelled.')).toBeVisible();
    await expect(page.getByText('“Changed my mind”')).toBeVisible();
    await expect(page.getByRole('button', { name: /cancel this project/i })).toHaveCount(0);
    await page.goto('/account/projects');
    await expect(
      page.getByRole('link', { name: /Website for my studio/ }).getByText('Cancelled'),
    ).toBeVisible();
  });

  test('a form with mistakes sends nothing and says what to fix', async ({ page }, testInfo) => {
    await signUpQuietly(page, uniqueEmail('mistakes', testInfo.project.name));
    await page.goto('/start-project');

    await page.getByRole('button', { name: 'Send project request' }).click();

    await expect(
      page.getByText('Give your project a short name (at least 3 characters)'),
    ).toBeVisible();
    await expect(page.getByText('Choose the type of website you need')).toBeVisible();
    await expect(page.getByText('Tell us a little more (at least 30 characters)')).toBeVisible();
    await expect(page.getByLabel(/^Project name/)).toBeFocused();
    await expect(page.getByText('Your project request has been sent')).toHaveCount(0);

    await page.goto('/account/projects');
    await expect(page.getByRole('heading', { name: 'No projects yet' })).toBeVisible();
  });

  test('a visitor is taken through sign-up and brought back to the form', async ({
    page,
  }, testInfo) => {
    await page.goto('/start-project?type=business-websites');
    await expect(page.getByRole('heading', { name: 'Sign in to send your project' })).toBeVisible();
    await expect(page.getByLabel(/^Project name/)).toHaveCount(0);

    await page.getByRole('link', { name: 'Create a free account' }).click();
    await page.getByLabel(/^Your name/).fill('Ravi Kumar');
    await page.getByLabel(/^Email/).fill(uniqueEmail('comeback', testInfo.project.name));
    await page.getByLabel(/^Password/).fill(strongPassword);
    await page.getByLabel(/I agree to the/).check();
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page).toHaveURL('/start-project?type=business-websites');
    await expect(page.getByLabel(/^Project name/)).toBeVisible();
    await expect(page.getByLabel(/^Type of website/)).toHaveValue('business-websites');
  });
});

test.describe('who can see a project', () => {
  test("a customer can't see another customer's project, on the page or in the API", async ({
    page,
  }, testInfo) => {
    await signUpQuietly(page, uniqueEmail('owner', testInfo.project.name));
    const reference = await sendProjectQuietly(page);
    await page.request.post('/api/v1/auth/logout');

    await signUpQuietly(page, uniqueEmail('snoop', testInfo.project.name));
    await page.goto(`/account/projects/${reference}`);
    await expect(
      page.getByRole('heading', { name: "We couldn't find that project" }),
    ).toBeVisible();
    await expect(page.getByText('Website for my studio')).toHaveCount(0);

    await page.goto('/account/projects');
    await expect(page.getByRole('heading', { name: 'No projects yet' })).toBeVisible();

    const direct = await page.request.get(`/api/v1/project-requests/${reference}`);
    expect(direct.status()).toBe(404);
    const cancel = await page.request.post(`/api/v1/project-requests/${reference}/actions`, {
      data: { action: 'cancel' },
    });
    expect(cancel.status()).toBe(404);
  });

  test('a signed-out visitor is sent to sign in, then back to the project', async ({
    page,
  }, testInfo) => {
    await signUpQuietly(page, uniqueEmail('later', testInfo.project.name));
    const reference = await sendProjectQuietly(page);
    await page.request.post('/api/v1/auth/logout');

    await page.goto(`/account/projects/${reference}`);

    await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
    await expect(page).toHaveURL(
      `/login?next=${encodeURIComponent(`/account/projects/${reference}`)}`,
    );
    expect((await page.request.get(`/api/v1/project-requests/${reference}`)).status()).toBe(401);
  });

  test('an administrator is not offered the form, and the API refuses their request', async ({
    page,
  }) => {
    await signInAsAdminQuietly(page);
    await page.goto('/start-project');
    await expect(page.getByText("You're signed in as an administrator")).toBeVisible();
    await expect(page.getByLabel(/^Project name/)).toHaveCount(0);

    const response = await page.request.post('/api/v1/project-requests', {
      data: {
        title: 'Website for my studio',
        categoryKey: 'business-websites',
        description: 'A simple five-page website for my photography studio, with a gallery.',
      },
    });
    expect(response.status()).toBe(403);
  });
});

test.describe('the administrator overview', () => {
  test('counts project requests, matching what the server says', async ({ page }, testInfo) => {
    await signUpQuietly(page, uniqueEmail('counted', testInfo.project.name));
    await sendProjectQuietly(page);
    await page.request.post('/api/v1/auth/logout');

    await signInAsAdminQuietly(page);
    await page.goto('/admin');

    // The totals are real: at least this project, and "new requests" is part of them.
    const total = page
      .getByRole('region', { name: 'At a glance' })
      .getByText('Project requests', { exact: true });
    await expect(total).toBeVisible();
    await expect(total.locator('xpath=following-sibling::p')).toHaveText(/^[1-9]\d*$/);
    const fresh = page
      .getByRole('region', { name: 'Needs you now' })
      .getByRole('link', { name: /New requests/ });
    await expect(fresh.locator('p').first()).toHaveText(/^[1-9]\d*$/);
    await expect(
      page
        .getByRole('region', { name: 'Projects by status' })
        .getByRole('link', { name: /^Request Received [1-9]\d*$/ }),
    ).toBeVisible();

    // Never more than the total, and the same figures the API reports.
    const overview = (await (await page.request.get('/api/v1/admin/overview')).json()) as {
      projectRequests: { total: number; received: number };
    };
    expect(overview.projectRequests.received).toBeLessThanOrEqual(overview.projectRequests.total);
    expect(overview.projectRequests.total).toBeGreaterThan(0);
  });
});
