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

/**
 * The Product Catalogue live demo (Phase 12): a catalogue without a checkout, so the thing that
 * has to work is the enquiry. Products are marked Sample, "Enquire" carries the product into the
 * form, and WhatsApp explains instead of contacting anyone (D-014).
 */
test.describe('the Product Catalogue live demo', () => {
  test('a visitor filters by category, then enquires about a product and it is saved', async ({
    page,
  }) => {
    await page.goto('/demo/catalogue');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Cotton for every room, woven by hand.' }),
    ).toBeVisible();

    // All nine products to start with, each one marked as a sample.
    const products = page
      .getByRole('list')
      .filter({ has: page.getByRole('article') })
      .first();
    await expect(products.getByRole('article')).toHaveCount(9);

    // Filtering by category narrows the list, and says so for a screen reader.
    const filters = page.getByRole('group', { name: 'Show products by category' });
    await filters.getByRole('button', { name: 'Bedding' }).click();
    await expect(filters.getByRole('button', { name: 'Bedding' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(products.getByRole('article')).toHaveCount(3);
    await expect(page.getByRole('status')).toContainText('Showing 3 in Bedding');

    // "Details" opens the measurements for one product, without leaving the page.
    const quilt = products.getByRole('article').filter({ hasText: 'Kantha-stitch quilt' });
    await quilt.getByRole('button', { name: 'Details' }).click();
    await expect(quilt.getByText('Hand stitched, takes 3 weeks')).toBeVisible();

    // "Enquire" goes to the form with that product already chosen.
    await quilt.getByRole('link', { name: 'Enquire about the Kantha-stitch quilt' }).click();
    const form = page.getByRole('form', { name: 'Enquiry form' });
    await expect(form.getByLabel('Product')).toHaveValue('Kantha-stitch quilt');

    await form.getByLabel('Name').fill('Asha Test');
    await form.getByLabel('Email').fill('asha@example.com');
    await form.getByLabel('Phone (optional)').fill('+91 99999 99999');
    await form.getByLabel('How many (optional)').fill('2');
    await form.getByLabel('Anything else? (optional)').fill('Do you have this in a lighter blue?');
    const sent = page.waitForResponse('**/api/v1/demo-submissions');
    await form.getByRole('button', { name: 'Send enquiry' }).click();
    expect((await sent).status()).toBe(201);
    await expect(form.getByRole('status')).toContainText(
      'Thank you. Your enquiry about the Kantha-stitch quilt was received. We will reply within a day.',
    );
  });

  test('an enquiry without a product asks for one instead of sending', async ({ page }) => {
    await page.goto('/demo/catalogue');
    const form = page.getByRole('form', { name: 'Enquiry form' });
    await form.getByLabel('Name').fill('Kiran Test');
    await form.getByLabel('Email').fill('kiran@example.com');

    let posted = false;
    page.on('request', (request) => {
      if (request.url().includes('/demo-submissions')) posted = true;
    });
    await form.getByRole('button', { name: 'Send enquiry' }).click();
    await expect(form.getByLabel('Product')).toHaveAttribute('aria-invalid', 'true');
    expect(posted).toBe(false);
  });

  test('WhatsApp about a product explains instead of contacting anyone', async ({ page }) => {
    await page.goto('/demo/catalogue');
    const leaving: string[] = [];
    page.on('request', (request) => {
      if (!request.url().startsWith('http://localhost')) leaving.push(request.url());
    });
    await page.getByRole('button', { name: 'WhatsApp about the Ikat cushion cover' }).click();
    await expect(page.getByText(/this opens WhatsApp to Indigo Loom/)).toBeVisible();
    expect(page.url()).toMatch(/\/demo\/catalogue$/);
    expect(leaving).toEqual([]);
  });
});

test.describe('the College and Event live demo', () => {
  test('a visitor registers for an event, and it is saved', async ({ page }) => {
    await page.goto('/demo/event');
    await expect(page.getByRole('heading', { level: 1, name: 'Spectra 2027' })).toBeVisible();
    const form = page.getByRole('form', { name: 'Registration form' });
    await form.getByLabel('Name').fill('Asha Test');
    await form.getByLabel('Email').fill('asha@example.com');
    await form.getByLabel('College (optional)').fill('A college');
    await form.getByLabel('Event').selectOption('Hackathon');
    const sent = page.waitForResponse('**/api/v1/demo-submissions');
    await form.getByRole('button', { name: 'Register' }).click();
    expect((await sent).status()).toBe(201);
    await expect(form.getByRole('status')).toContainText("You're registered for Hackathon.");
  });
});
