import { expect, test } from '@playwright/test';
import {
  adminMovesQuietly,
  goodQuote,
  inDays,
  sendContactMessageQuietly,
  sendProjectQuietly,
  signInAsAdminQuietly,
  signInQuietly,
  signOutQuietly,
  signUpQuietly,
  uniqueEmail,
} from './helpers';

/**
 * Full-page screenshots of the administration pages and of each stage of a customer's project,
 * for reviewing the design at phone, tablet and desktop widths. Only runs when asked:
 *   SCREENSHOTS=1 npm run test:e2e -- screenshots-admin
 * The images are saved in test-results/screens/.
 */
test.skip(!process.env.SCREENSHOTS, 'Set SCREENSHOTS=1 to capture screenshots');
// A step that never appears should fail in seconds, not hold the run until the test times out.
test.use({ actionTimeout: 15_000 });

const widths = [390, 768, 1280];

for (const width of widths) {
  test(`admin and project-stage screenshots at ${width}px`, async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'One run is enough');
    test.setTimeout(240_000);
    await page.setViewportSize({ width, height: 900 });

    const shot = async (name: string) => {
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: `test-results/screens/${name}-${width}.png`, fullPage: true });
    };
    const email = uniqueEmail('shots-admin', testInfo.project.name);
    const heading = (name: string | RegExp) => page.getByRole('heading', { name }).first();

    // A customer sends two projects; a visitor sends a message.
    await signUpQuietly(page, email, { name: 'Asha Rao' });
    const reference = await sendProjectQuietly(page, {
      notes: 'Please message me after 5 pm.',
      features: ['gallery', 'contact-form'],
      integrations: ['google-maps'],
      packageKey: 'professional-website',
      contactPreference: 'whatsapp',
      phone: '+91 98866 07720',
      preferredDate: '2099-01-31',
    });
    await sendProjectQuietly(page, {
      title: 'Online shop for handmade soap',
      categoryKey: 'ecommerce',
    });
    await sendContactMessageQuietly(request, 'Ravi Kumar', {
      message:
        'Hello! I would like a website for my sweet shop. Can you share the cost and how long it takes?',
    });
    await signOutQuietly(page);

    // Prajzo asks a question; the customer sees it and answers.
    await adminMovesQuietly(page, reference, { to: 'under-review' });
    await adminMovesQuietly(page, reference, {
      to: 'awaiting-information',
      note: 'Please send your logo and brand colours, and tell us which photos to use.',
    });
    await signInQuietly(page, email);
    await page.goto(`/account/projects/${reference}`);
    await heading('Prajzo needs something from you').waitFor();
    await shot('customer-question');
    await page.getByLabel(/^Your answer/).fill('The logo is on WhatsApp. Colours: blue and white.');
    await page.getByRole('button', { name: 'Send answer' }).click();
    await page.getByText('Your answer was sent').waitFor();
    await shot('customer-question-answered');
    await signOutQuietly(page);

    // The administrator's pages.
    await signInAsAdminQuietly(page);
    await page.goto('/admin');
    await heading('Needs you now').waitFor();
    await shot('admin-overview');
    await page.goto('/admin/projects');
    await page.getByRole('link', { name: new RegExp(reference) }).waitFor();
    await shot('admin-projects');
    await page.goto(`/admin/projects/${reference}`);
    await page.getByText('The customer answered your question', { exact: true }).waitFor();
    await shot('admin-project-customer-replied');

    const post = async (path: string, data: Record<string, unknown>) => {
      const response = await page.request.post(
        `/api/v1/admin/project-requests/${reference}/${path}`,
        { data },
      );
      expect(response.ok(), await response.text()).toBe(true);
    };
    await post('notes', { text: 'Called on WhatsApp: she prefers a blue theme.' });
    await post('status', { to: 'under-review' });
    await page.goto(`/admin/projects/${reference}`);
    const panel = page.getByRole('region', { name: 'Move this project on' });
    await panel.getByLabel('Move to').selectOption({ label: 'Quote Sent' });
    await panel.getByRole('button', { name: 'Send quote' }).click();
    await panel.getByText('Enter the price in rupees, for example 15000').waitFor();
    await shot('admin-project-quote-form-errors');
    await post('status', {
      to: 'quote-sent',
      quote: goodQuote,
      note: 'Thank you for your patience!',
    });
    await page.goto(`/admin/projects/${reference}`);
    await heading('Quote').waitFor();
    await shot('admin-project-quote-sent');

    await page.goto('/admin/customers');
    await page
      .getByRole('link', { name: /Asha Rao/ })
      .first()
      .waitFor();
    await shot('admin-customers');
    await page
      .getByRole('link', { name: /Asha Rao/ })
      .first()
      .click();
    await page.getByRole('heading', { level: 1, name: 'Asha Rao' }).waitFor();
    await shot('admin-customer');
    await page.goto('/admin/messages');
    await page.getByText('Ravi Kumar').first().waitFor();
    await shot('admin-messages');
    await page.goto('/admin/catalogue');
    await page.getByRole('list', { name: 'Packages' }).waitFor();
    await shot('admin-catalogue');
    await page.goto('/admin/catalogue/packages/professional-website');
    await page.getByRole('heading', { level: 1, name: /^Edit/ }).waitFor();
    await shot('admin-package-edit');
    await page.goto('/admin/catalogue/categories/new');
    await page.getByRole('button', { name: 'Add website type' }).click();
    await page.getByText('Enter a title (at least 2 characters)').waitFor();
    await shot('admin-category-errors');
    await page.goto('/admin/activity');
    await page.getByRole('heading', { level: 1, name: 'Activity' }).waitFor();
    // The newest entries are shown, whatever they are: each names who did it.
    await page
      .getByText(/^(Admin|Customer)$/)
      .first()
      .waitFor();
    await shot('admin-activity');
    await signOutQuietly(page);

    // The customer reads the quote and accepts it.
    await signInQuietly(page, email);
    await page.goto(`/account/projects/${reference}`);
    await heading('Your quote').waitFor();
    await shot('customer-quote');
    await page.getByRole('button', { name: 'Accept this quote' }).click();
    await page.getByText('Accept this quote?').waitFor();
    await shot('customer-quote-accept-question');
    await page.getByRole('button', { name: 'Yes, accept the quote' }).click();
    await page.getByText('You accepted the quote').waitFor();
    await shot('customer-quote-accepted');
    await signOutQuietly(page);

    // The project is built; the customer reviews it.
    await adminMovesQuietly(page, reference, {
      to: 'in-development',
      confirmedDeliveryDate: inDays(14),
    });
    await adminMovesQuietly(page, reference, { to: 'testing' });
    await adminMovesQuietly(page, reference, {
      to: 'awaiting-review',
      note: 'The preview is ready at https://preview.example.com/asha-studio',
    });
    await signInQuietly(page, email);
    await page.goto(`/account/projects/${reference}`);
    await heading('Your project is ready for you to review').waitFor();
    await shot('customer-review');
    await page.getByRole('button', { name: 'Ask for changes' }).click();
    await page.getByRole('button', { name: 'Send change request' }).click();
    await page.getByText("Tell us what you'd like changed (at least 5 characters)").waitFor();
    await shot('customer-review-changes-errors');
    await page.getByRole('button', { name: 'Not now' }).click();
    await page.getByRole('button', { name: 'It looks good' }).click();
    await page.getByText('You told us it looks good').waitFor();
    await shot('customer-review-signed-off');
    await signOutQuietly(page);

    // The administrator is told, and completes it.
    await signInAsAdminQuietly(page);
    await page.goto(`/admin/projects/${reference}`);
    await page.getByText('The customer said it looks good', { exact: true }).waitFor();
    await shot('admin-project-signed-off');
    const finish = page.getByRole('region', { name: 'Move this project on' });
    await finish.getByLabel('Move to').selectOption({ label: 'Completed' });
    await shot('admin-project-final-move');
    await finish.getByRole('checkbox', { name: /I understand that/ }).check();
    await finish.getByRole('button', { name: 'Move to Completed' }).click();
    await page.getByText('Moved to Completed').waitFor();
    await shot('admin-project-completed');
    await signOutQuietly(page);

    await signInQuietly(page, email);
    await page.goto(`/account/projects/${reference}`);
    await page.getByText('Your project is complete.').waitFor();
    await shot('customer-completed');
  });
}
