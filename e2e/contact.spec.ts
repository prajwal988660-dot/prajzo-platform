import { expect, test, type Page } from '@playwright/test';

async function fillTheForm(page: Page, name: string) {
  await page.getByLabel(/Your name/).fill(name);
  await page.getByLabel(/^Email/).fill('e2e@example.com');
  await page
    .getByLabel(/About your project/)
    .fill('Testing the contact form from start to finish.');
  await page.getByLabel(/I agree that Prajzo may contact me/).check();
}

test('a visitor can send a message and sees the confirmation', async ({ page }) => {
  await page.goto('/contact?type=business-websites');
  await expect(page.getByLabel('Type of website')).toHaveValue('business-websites');

  await fillTheForm(page, 'E2E Visitor');
  await page.getByRole('button', { name: 'Send message' }).click();

  await expect(page.getByText('Message sent')).toBeVisible();
  await expect(page.getByText(/Thanks, E2E Visitor/)).toBeVisible();
});

test('the form explains what is missing before anything is sent', async ({ page }) => {
  await page.goto('/contact');
  let posted = false;
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().includes('/api/v1/contact')) posted = true;
  });

  await page.getByRole('button', { name: 'Send message' }).click();

  await expect(page.getByText('Enter your name')).toBeVisible();
  await expect(page.getByText('Tick this box so we can reply to you')).toBeVisible();
  expect(posted).toBe(false);
});

test('a server failure is reported and never shown as success', async ({ page }) => {
  await page.route('**/api/v1/contact', (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Something went wrong on our side. Please try again.',
        },
      }),
    }),
  );
  await page.goto('/contact');

  await fillTheForm(page, 'E2E Failure');
  await page.getByRole('button', { name: 'Send message' }).click();

  await expect(page.getByRole('alert')).toContainText("Your message wasn't sent");
  await expect(page.getByText('Message sent')).toHaveCount(0);
  await expect(page.getByLabel(/Your name/)).toHaveValue('E2E Failure');
});
