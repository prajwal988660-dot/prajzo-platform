import { expect, test } from '@playwright/test';
import { expectNoSeriousProblems } from './axe';
import { sendProjectQuietly, signInAsAdminQuietly, signUpQuietly, uniqueEmail } from './helpers';

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
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password?token=abcdefghijklmnopqrstuvwxyz0123456789',
  '/admin/login',
  '/page-that-does-not-exist',
];

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

  test('the Start a Project form, empty and with its error messages showing', async ({
    page,
  }, testInfo) => {
    await signUpQuietly(page, uniqueEmail('axe-form', testInfo.project.name));
    await page.goto('/start-project');
    await expect(page.getByLabel(/^Project name/)).toBeVisible();
    await expectNoSeriousProblems(page);

    await page.getByRole('button', { name: 'Send project request' }).click();
    await expect(page.getByText('Choose the type of website you need')).toBeVisible();
    await expectNoSeriousProblems(page);
  });

  test('My projects and a project page (with the cancel question open)', async ({
    page,
  }, testInfo) => {
    await signUpQuietly(page, uniqueEmail('axe-projects', testInfo.project.name));
    const reference = await sendProjectQuietly(page, { notes: 'A note', features: ['gallery'] });

    await page.goto('/account/projects');
    await expect(page.getByRole('link', { name: /Website for my studio/ })).toBeVisible();
    await expectNoSeriousProblems(page);

    await page.goto(`/account/projects/${reference}`);
    await expect(page.getByRole('heading', { name: 'Timeline' })).toBeVisible();
    await expectNoSeriousProblems(page);

    await page.getByRole('button', { name: 'Cancel this project' }).click();
    await expect(page.getByText('Are you sure you want to cancel this project?')).toBeVisible();
    await expectNoSeriousProblems(page);
  });

  test('the administration overview has no serious accessibility problems', async ({ page }) => {
    await signInAsAdminQuietly(page);
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Needs you now' })).toBeVisible();
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
