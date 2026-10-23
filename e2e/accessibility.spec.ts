import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { signInAsAdminQuietly, signUpQuietly, uniqueEmail } from './helpers';

const publicPages = [
  '/',
  '/services',
  '/how-it-works',
  '/pricing',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password?token=abcdefghijklmnopqrstuvwxyz0123456789',
  '/admin/login',
  '/page-that-does-not-exist',
];

async function expectNoSeriousProblems(page: Page) {
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.waitForLoadState('networkidle');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const serious = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );

  expect(
    serious.map((violation) => ({
      rule: violation.id,
      help: violation.help,
      elements: violation.nodes.map((node) => node.target.join(' ')),
    })),
  ).toEqual([]);
}

for (const path of publicPages) {
  test(`${path} has no serious accessibility problems`, async ({ page }) => {
    await page.goto(path);
    await expectNoSeriousProblems(page);
  });
}

test.describe('signed-in pages', () => {
  test('the customer account page has no serious accessibility problems', async ({
    page,
  }, testInfo) => {
    await signUpQuietly(page, uniqueEmail('axe', testInfo.project.name));
    await page.goto('/account');
    await expectNoSeriousProblems(page);
  });

  test('the administration overview has no serious accessibility problems', async ({ page }) => {
    await signInAsAdminQuietly(page);
    await page.goto('/admin');
    await expect(page.getByText('Customers', { exact: true })).toBeVisible();
    await expectNoSeriousProblems(page);
  });
});

test.describe('error messages are accessible too', () => {
  test('the sign-in page with its error messages showing', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Enter your email address')).toBeVisible();
    await expectNoSeriousProblems(page);
  });

  test('the sign-up page with its error messages showing', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Enter your name')).toBeVisible();
    await expectNoSeriousProblems(page);
  });

  test('the contact form with its error messages showing', async ({ page }) => {
    await page.goto('/contact');
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByText('Enter your name')).toBeVisible();
    await expectNoSeriousProblems(page);
  });
});
