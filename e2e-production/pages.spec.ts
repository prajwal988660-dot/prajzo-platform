import { expect, test, type Page } from '@playwright/test';
import {
  sendContactMessageQuietly,
  sendProjectQuietly,
  signOutQuietly,
  signUpQuietly,
  uniqueEmail,
} from '../e2e/helpers';
import { watchForProblems } from './helpers';

/**
 * Every kind of page, opened in a real browser on the real production build. Any complaint from
 * the browser fails the test: a script or style blocked by the content security policy, an error
 * in the console, a request that failed, or an answer that wasn't a success. The strict policy is
 * only in force on the production build, so this is the only place that can catch them.
 */

async function expectCleanPage(
  page: Page,
  address: string,
  heading?: string | RegExp,
  /** For the one page that is meant to be answered with 404: the "not found" page itself. */
  expectedStatus = 200,
) {
  const watching = watchForProblems(
    page,
    (status, url) => status === expectedStatus && url.endsWith(address),
  );
  const response = await page.goto(address);
  expect(response?.status(), address).toBe(expectedStatus);
  await expect(
    heading
      ? page.getByRole('heading', { name: heading }).first()
      : page.getByRole('heading', { level: 1 }),
  ).toBeVisible();
  await page.waitForLoadState('networkidle');
  // Chrome writes one console error for an answer that is not a success, even a page that is
  // meant to be one, such as the "not found" page. That one message is expected, nothing else.
  const problems = watching.problems();
  if (expectedStatus !== 200) {
    const expected = `console error: Failed to load resource: the server responded with a status of ${expectedStatus}`;
    const index = problems.findIndex((problem) => problem.startsWith(expected));
    expect(index, `${address} should log the ${expectedStatus} once`).toBeGreaterThanOrEqual(0);
    problems.splice(index, 1);
  }
  expect(problems, address).toEqual([]);
}

const publicPages = [
  '/',
  '/services',
  '/how-it-works',
  '/pricing',
  '/about',
  '/contact',
  '/start-project',
  '/privacy',
  '/terms',
  '/demo/portfolio',
  '/demo/business',
  '/templates/business',
  '/templates',
  '/templates/portfolio',
  '/projects',
  '/build',
  '/build?template=portfolio',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password?token=abcdefghijklmnopqrstuvwxyz0123456789',
  '/admin/login',
  '/page-that-does-not-exist',
];

test.describe('public pages', () => {
  for (const address of publicPages) {
    test(`${address} opens with no browser complaints`, async ({ page }) => {
      // The one made-up address is answered with 404; the app still shows its page for it.
      await expectCleanPage(
        page,
        address,
        undefined,
        address === '/page-that-does-not-exist' ? 404 : 200,
      );
    });
  }

  test('the contact form works under the policy: it sends, and shows the confirmation', async ({
    page,
  }) => {
    const watching = watchForProblems(page, () => false);
    await page.goto('/contact');
    await page.getByLabel(/Your name/).fill('Production Check');
    await page.getByLabel(/^Email/).fill('production-check@example.com');
    await page.getByLabel(/About your project/).fill('Testing the contact form on the real build.');
    await page.getByLabel(/I agree that Prajzo may contact me/).check();
    await page.getByRole('button', { name: 'Send message' }).click();

    await expect(page.getByText('Message sent')).toBeVisible();
    expect(watching.problems()).toEqual([]);
  });
});

test.describe('a customer', () => {
  test('signs up, sends a project and follows it, with no browser complaints', async ({
    page,
  }, testInfo) => {
    const watching = watchForProblems(page, () => false);
    await page.goto('/register');
    await page.getByLabel(/^Your name/).fill('Production Check');
    await page.getByLabel(/^Email/).fill(uniqueEmail('prod', testInfo.project.name));
    await page.getByLabel(/^Password/).fill('a-long-passphrase-9');
    await page.getByLabel(/I agree to the/).check();
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByRole('heading', { level: 1, name: /Welcome/ })).toBeVisible();

    const reference = await sendProjectQuietly(page, {
      notes: 'Sent from the production check.',
      features: ['gallery'],
    });
    for (const address of ['/account', '/account/projects', `/account/projects/${reference}`]) {
      await page.goto(address);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await page.waitForLoadState('networkidle');
    }
    await page.goto('/start-project');
    await expect(page.getByLabel(/^Project name/)).toBeVisible();

    // Still signed in after a reload: the cookie really works in production mode.
    await page.reload();
    await expect(page.getByLabel(/^Project name/)).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(watching.problems()).toEqual([]);
  });
});

test.describe('the administrator', () => {
  test('signs in and opens every admin page, with no browser complaints', async ({
    page,
    request,
  }, testInfo) => {
    test.setTimeout(90_000);
    await signUpQuietly(page, uniqueEmail('prod-admin', testInfo.project.name), {
      name: 'Production Customer',
    });
    const reference = await sendProjectQuietly(page);
    await sendContactMessageQuietly(request, 'Production Visitor');
    await signOutQuietly(page);

    const watching = watchForProblems(page, () => false);
    await page.goto('/admin/login');
    await page.getByLabel(/^Email/).fill(process.env.E2E_ADMIN_EMAIL ?? '');
    await page.getByLabel(/^Password/).fill(process.env.E2E_ADMIN_PASSWORD ?? '');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible();

    for (const address of [
      '/admin',
      '/admin/projects?status=all',
      `/admin/projects/${reference}`,
      '/admin/customers',
      '/admin/messages?status=all',
      '/admin/catalogue',
      '/admin/catalogue/packages/professional-website',
      '/admin/catalogue/categories/new',
      '/admin/activity',
    ]) {
      await page.goto(address);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await page.waitForLoadState('networkidle');
    }

    // And an action: the move panel and a note, which use forms and the API.
    await page.goto(`/admin/projects/${reference}`);
    const panel = page.getByRole('region', { name: 'Move this project on' });
    await panel.getByLabel('Move to').selectOption({ label: 'Under Review' });
    await panel.getByRole('button', { name: 'Move to Under Review' }).click();
    await expect(page.getByText('Moved to Under Review', { exact: true })).toBeVisible();

    // Signing in is not needed again after a reload: the administrator's cookie works too.
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(watching.problems()).toEqual([]);
  });
});
