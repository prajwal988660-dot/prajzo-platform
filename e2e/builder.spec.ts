import { expect, test, type Page } from '@playwright/test';
import { signUpQuietly, uniqueEmail } from './helpers';

/**
 * The website builder (Phase 9), in a real browser against the real API and database, on a
 * computer and a phone.
 */

/** The preview frame's page. */
const preview = (page: Page) => page.frameLocator('iframe[title^="Preview of your website"]');

async function showPreview(page: Page, isMobile: boolean) {
  // On a phone the preview is its own step; elsewhere it is always beside the editor.
  if (isMobile) await page.getByRole('button', { name: 'Preview', exact: true }).click();
}

test.describe('the website builder', () => {
  test('Customize → change the heading and a colour → see it → save → reload → still there', async ({
    page,
    isMobile,
  }, testInfo) => {
    await signUpQuietly(page, uniqueEmail('builder', testInfo.project.name));

    await page.goto('/templates');
    await page.getByRole('link', { name: 'Customize This Design: Portfolio' }).click();
    await expect(page).toHaveURL(/\/build\?template=portfolio$/);

    // The builder starts from the Portfolio demo.
    const editor = page.getByRole('region', { name: 'Edit your website' });
    const heading = editor.getByLabel('Heading', { exact: true }).first();
    await expect(heading).toHaveValue('I design calm, useful apps for busy people.');

    await heading.fill('Calm websites for busy founders');
    await page.getByRole('button', { name: /Design/ }).click();
    await editor.getByLabel('Main colour (buttons)').fill('#0f766e');

    await showPreview(page, isMobile);
    const frame = preview(page);
    await expect(frame.getByRole('heading', { level: 1 })).toHaveText(
      'Calm websites for busy founders',
    );
    await expect(frame.locator('.ps-site')).toHaveCSS('--site-primary', '#0f766e');

    await page.getByRole('button', { name: /Save/ }).click();
    await editor.getByLabel('Name of this design').fill('Founder portfolio');
    await editor.getByRole('button', { name: 'Save to my account' }).click();
    await expect(page).toHaveURL(/\/build\/[0-9a-f]{24}$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Founder portfolio');

    await page.reload();
    await expect(editor.getByLabel('Heading', { exact: true }).first()).toHaveValue(
      'Calm websites for busy founders',
    );
    await showPreview(page, isMobile);
    await expect(preview(page).getByRole('heading', { level: 1 })).toHaveText(
      'Calm websites for busy founders',
    );

    // It is in My saved designs.
    await page.goto('/account/designs');
    await expect(
      page.getByRole('link', { name: 'Open Founder portfolio in the builder' }),
    ).toBeVisible();
  });

  test('a visitor’s draft stays in this browser, and they are offered an account', async ({
    page,
  }) => {
    await page.goto('/build?template=portfolio');
    const editor = page.getByRole('region', { name: 'Edit your website' });
    await editor.getByLabel('Heading', { exact: true }).first().fill('A draft that stays');
    // The draft is kept a moment after typing stops.
    await page.waitForTimeout(800);

    await page.reload();
    await expect(page.getByText('Your draft is back')).toBeVisible();
    await expect(editor.getByLabel('Heading', { exact: true }).first()).toHaveValue(
      'A draft that stays',
    );

    await page.getByRole('button', { name: /Save/ }).click();
    await expect(editor.getByRole('link', { name: 'Create a free account' })).toBeVisible();
  });

  test('a problem shows beside its field and stops saving until it is fixed', async ({
    page,
  }, testInfo) => {
    await signUpQuietly(page, uniqueEmail('builder-check', testInfo.project.name));
    await page.goto('/build?template=portfolio');
    const editor = page.getByRole('region', { name: 'Edit your website' });
    const heading = editor.getByLabel('Heading', { exact: true }).first();
    await heading.fill('');
    await expect(editor.getByText("The heading can't be empty")).toBeVisible();
    await page.getByRole('button', { name: /Save/ }).click();
    await expect(editor.getByRole('button', { name: 'Save to my account' })).toBeDisabled();
  });

  test('one customer cannot open another customer’s design', async ({ browser }, testInfo) => {
    const owner = await browser.newPage();
    await signUpQuietly(owner, uniqueEmail('owner', testInfo.project.name));
    await owner.goto('/build?template=portfolio');
    await owner.getByRole('button', { name: /Save/ }).click();
    await owner.getByRole('button', { name: 'Save to my account' }).click();
    await expect(owner).toHaveURL(/\/build\/[0-9a-f]{24}$/);
    const address = new URL(owner.url()).pathname;

    const other = await browser.newPage();
    await signUpQuietly(other, uniqueEmail('other', testInfo.project.name));
    await other.goto(address);
    await expect(
      other.getByRole('heading', { level: 1, name: "We couldn't find that design" }),
    ).toBeVisible();
    await owner.close();
    await other.close();
  });
});
