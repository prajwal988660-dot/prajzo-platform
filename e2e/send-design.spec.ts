import { expect, test } from '@playwright/test';
import { signUpQuietly, uniqueEmail } from './helpers';

/**
 * Sending a saved design as a project request (Phase 14), in a real browser against the real API
 * and database: build, save, send from My saved designs, land on the project, see it in My
 * Projects. On a computer and a phone.
 */
test('customize → save → send as a project → it is in My Projects', async ({ page }, testInfo) => {
  // Registering, building, saving and sending: more than the 30-second default under a full run.
  test.setTimeout(120_000);
  await signUpQuietly(page, uniqueEmail('send-design', testInfo.project.name));

  // Build and save, as in the builder tests.
  await page.goto('/build?template=portfolio');
  const editor = page.getByRole('region', { name: 'Edit your website' });
  await editor
    .getByLabel('Heading', { exact: true })
    .first()
    .fill('Calm websites for busy founders');
  await page.getByRole('button', { name: /Save/ }).click();
  await editor.getByLabel('Name of this design').fill('Founder portfolio');
  await editor.getByRole('button', { name: 'Save to my account' }).click();
  await expect(page).toHaveURL(/\/build\/[0-9a-f]{24}$/);

  // "Send as a project" on the saved design opens the builder on the Send step.
  await page.goto('/account/designs');
  await page.getByRole('link', { name: 'Send Founder portfolio to us as a project' }).click();
  await expect(page).toHaveURL(/\/build\/[0-9a-f]{24}\?step=send$/);

  // It says what is being sent, from the design itself.
  const summary = page.getByRole('region', { name: 'What you are sending' });
  await expect(summary).toContainText('Founder portfolio');
  await expect(summary).toContainText('Portfolio');
  await expect(summary).toContainText('Changing or deleting this design later will not change');

  // Only what the design cannot answer is asked for.
  await editor.getByLabel('What kind of website is this?').selectOption('business-websites');
  await editor.getByLabel('How should we reach you?').selectOption('whatsapp');
  await editor.getByLabel('Your phone number').fill('+91 98765 43210');
  await editor
    .getByLabel('Anything else we should know? (optional)')
    .fill('Please keep the colours exactly as they are.');

  const sent = page.waitForResponse('**/api/v1/project-requests/from-design');
  await editor.getByRole('button', { name: 'Send as a project' }).click();
  expect((await sent).status()).toBe(201);

  // It lands on the new project, named after the design.
  await expect(page).toHaveURL(/\/account\/projects\/PRZ-\d{4}-\d{4}/);
  await expect(page.getByRole('heading', { level: 1, name: 'Founder portfolio' })).toBeVisible();
  await expect(page.getByText('website builder')).toBeVisible();

  // And it is in My Projects.
  await page.goto('/account/projects');
  await expect(page.getByRole('link', { name: /Founder portfolio/ })).toBeVisible();
});

test('the Send step asks for a save first when there are unsaved changes', async ({
  page,
}, testInfo) => {
  await signUpQuietly(page, uniqueEmail('send-unsaved', testInfo.project.name));
  await page.goto('/build?template=portfolio&step=send');
  // Never saved: there is nothing on the account to send.
  await expect(page.getByText('Save your design first')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send as a project' })).toHaveCount(0);
});
