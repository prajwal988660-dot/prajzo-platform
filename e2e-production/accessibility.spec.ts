import { expect, test } from '@playwright/test';
import { expectNoSeriousProblems } from '../e2e/axe';
import {
  sendProjectQuietly,
  signInAsAdminQuietly,
  signUpQuietly,
  uniqueEmail,
} from '../e2e/helpers';

/**
 * The same accessibility check as in the development tests (WCAG 2.2 AA, serious and critical
 * problems fail), but on the real production build: its own files, its typefaces (Latin only, the
 * rupee sign from the system) and its strict content security policy. Runs against the live server.
 */

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
  '/demo/event',
  '/templates/event',
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

for (const address of publicPages) {
  test(`${address} has no serious accessibility problems`, async ({ page }) => {
    await page.goto(address);
    await expectNoSeriousProblems(page);
  });
}

test("a customer's pages have no serious accessibility problems", async ({ page }) => {
  await page.goto('/');
  await signUpQuietly(page, uniqueEmail('axe-customer', 'live'));
  const reference = await sendProjectQuietly(page, {
    notes: 'A note for the check',
    features: ['gallery'],
  });

  for (const address of [
    '/account',
    '/account/projects',
    `/account/projects/${reference}`,
    '/start-project',
  ]) {
    await page.goto(address);
    await expectNoSeriousProblems(page);
  }

  // The form with its error messages showing.
  await page.goto('/start-project');
  await page.getByRole('button', { name: 'Send project request' }).click();
  await expect(page.getByText('Choose the type of website you need')).toBeVisible();
  await expectNoSeriousProblems(page);
});

test('every administration page has no serious accessibility problems', async ({ page }) => {
  await page.goto('/');
  await signUpQuietly(page, uniqueEmail('axe-admin-data', 'live'));
  const reference = await sendProjectQuietly(page, { notes: 'A note for the check' });
  await page.request.post('/api/v1/auth/logout');
  await signInAsAdminQuietly(page);

  for (const address of [
    '/admin',
    '/admin/projects',
    `/admin/projects/${reference}`,
    '/admin/customers',
    '/admin/messages',
    '/admin/catalogue',
    '/admin/catalogue/packages/professional-website',
    '/admin/catalogue/categories/new',
    '/admin/activity',
  ]) {
    await page.goto(address);
    await expectNoSeriousProblems(page);
  }
});
