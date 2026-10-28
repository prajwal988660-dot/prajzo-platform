import { expect, test } from '@playwright/test';

/**
 * The Portfolio live demo (Phase 8), in a real browser on a computer and a phone, against the
 * real API and database: the form really sends, and nothing contacts anyone.
 */
test.describe('the Portfolio live demo', () => {
  test('from the Templates page to the live demo, and its contact form sends', async ({ page }) => {
    await page.goto('/templates');
    await expect(page.getByRole('heading', { level: 2, name: 'Portfolio' })).toBeVisible();
    await page.getByRole('link', { name: 'View Live Demo of the Portfolio template' }).click();
    await expect(page).toHaveURL(/\/demo\/portfolio$/);
    const form = page.getByRole('form', { name: 'Contact form' });
    await form.getByLabel('Name').fill('Asha Test');
    await form.getByLabel('Email').fill('asha@example.com');
    await form.getByLabel('Message').fill('I found this on the Templates page and like it.');
    await form.getByRole('button', { name: 'Send message' }).click();
    await expect(form.getByRole('status')).toHaveText('Thank you. Your message was received.');
  });

  test('a visitor reads it, uses the navigation and sends the contact form', async ({
    page,
    isMobile,
  }) => {
    await page.goto('/demo/portfolio');
    await expect(page.getByRole('complementary', { name: 'About this demo' })).toContainText(
      'Everyone and everything in it is made up.',
    );
    await expect(
      page.getByRole('heading', { level: 1, name: 'I design calm, useful apps for busy people.' }),
    ).toBeVisible();

    // The navigation (behind "Menu" on a phone) moves to the section.
    const site = page.getByRole('navigation', { name: 'Site' });
    if (isMobile) await site.getByRole('button', { name: 'Menu' }).click();
    await site.getByRole('link', { name: 'Contact' }).click();
    await expect(page).toHaveURL(/#contact$/);
    await expect(
      page.getByRole('heading', { level: 2, name: 'Let’s work together' }),
    ).toBeInViewport();

    // The demo bar never hides the section the visitor jumped to.
    const bar = await page.getByRole('complementary', { name: 'About this demo' }).boundingBox();
    const heading = await page
      .getByRole('heading', { level: 2, name: 'Let’s work together' })
      .boundingBox();
    expect(heading!.y).toBeGreaterThanOrEqual(bar!.y + bar!.height);

    const form = page.getByRole('form', { name: 'Contact form' });
    await form.getByLabel('Name').fill('Kiran Test');
    await form.getByLabel('Email').fill('kiran@example.com');
    await form.getByLabel('Message').fill('Could my portfolio look like this one, but in green?');
    const sent = page.waitForResponse('**/api/v1/demo-submissions');
    await form.getByRole('button', { name: 'Send message' }).click();
    expect((await sent).status()).toBe(201);
    await expect(form.getByRole('status')).toHaveText('Thank you. Your message was received.');
  });

  test('email, phone, WhatsApp and social links explain instead of contacting anyone', async ({
    page,
  }) => {
    await page.goto('/demo/portfolio');
    const leaving: string[] = [];
    page.on('request', (request) => {
      if (!request.url().startsWith('http://localhost')) leaving.push(request.url());
    });
    await page.getByRole('button', { name: 'Chat on WhatsApp' }).click();
    await expect(page.getByText(/this opens a WhatsApp chat\. This is a demo/)).toBeVisible();
    await page.getByRole('button', { name: 'Behance' }).click();
    await expect(page.getByText(/opens the Behance profile/)).toBeVisible();
    expect(page.url()).toMatch(/\/demo\/portfolio$/);
    expect(leaving).toEqual([]);
  });

  test('works with the keyboard alone: skip link, then straight to the content', async ({
    page,
  }) => {
    await page.goto('/demo/portfolio');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to main content' });
    await expect(skip).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#site-main')).toBeFocused();
  });

  test('an address that is not a demo shows the not-found page', async ({ page }) => {
    // The real 404 status is checked on the production build (e2e-production/build.spec.ts).
    await page.goto('/demo/not-a-template');
    await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
  });
});
