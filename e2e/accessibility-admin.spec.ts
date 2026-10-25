import { expect, test } from '@playwright/test';
import { expectNoSeriousProblems } from './axe';
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

test.describe('the administration pages', () => {
  test('every admin list and page, with real data in it', async ({ page, request }, testInfo) => {
    test.setTimeout(120_000);
    const email = uniqueEmail('axe-admin', testInfo.project.name);
    await signUpQuietly(page, email, { name: 'Axe Customer' });
    await sendProjectQuietly(page, { notes: 'A note', features: ['gallery'] });
    const visitor = `Axe Visitor ${testInfo.project.name}`;
    await sendContactMessageQuietly(request, visitor);
    await signOutQuietly(page);
    await signInAsAdminQuietly(page);

    for (const path of [
      '/admin',
      '/admin/projects',
      '/admin/projects?status=all',
      '/admin/customers',
      `/admin/messages?status=all&q=${encodeURIComponent(visitor)}`,
      '/admin/catalogue',
      '/admin/activity',
    ]) {
      await page.goto(path);
      await expectNoSeriousProblems(page);
    }

    // A customer's page.
    await page.goto(`/admin/customers?q=${encodeURIComponent(email)}`);
    await page.getByRole('link', { name: /Axe Customer/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Axe Customer' })).toBeVisible();
    await expectNoSeriousProblems(page);

    // Pages with nothing in them, and a project that does not exist, are accessible too.
    await page.goto('/admin/projects?status=completed&q=nothing-matches-this');
    await expect(page.getByRole('heading', { name: 'No projects match' })).toBeVisible();
    await expectNoSeriousProblems(page);
    await page.goto('/admin/projects/PRZ-2000-0000');
    await expect(
      page.getByRole('heading', { name: "We couldn't find that project" }),
    ).toBeVisible();
    await expectNoSeriousProblems(page);
  });

  test('a project page: the form for each kind of move, the notes and the delivery date', async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    await signUpQuietly(page, uniqueEmail('axe-moves', testInfo.project.name));
    const reference = await sendProjectQuietly(page);
    await signOutQuietly(page);
    await signInAsAdminQuietly(page);
    await page.goto(`/admin/projects/${reference}`);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Website for my studio' }),
    ).toBeVisible();
    await expectNoSeriousProblems(page);

    // A final move, with the tick that has to come first.
    const panel = page.getByRole('region', { name: 'Move this project on' });
    await panel.getByLabel('Move to').selectOption({ label: 'Cancelled' });
    await expect(panel.getByLabel(/I understand that/)).toBeVisible();
    await expectNoSeriousProblems(page);

    // The delivery date and the notes, with their error messages showing.
    await page
      .getByRole('region', { name: 'Delivery date' })
      .getByRole('button', { name: 'Confirm date' })
      .click();
    await expect(page.getByText('Choose a date from the calendar')).toBeVisible();
    await page
      .getByRole('region', { name: 'Internal notes' })
      .getByRole('button', { name: 'Add note' })
      .click();
    await expect(page.getByText('Write the note')).toBeVisible();
    await expectNoSeriousProblems(page);

    // Under review, then the quote form with its error messages showing.
    await panel.getByLabel('Move to').selectOption({ label: 'Under Review' });
    await panel.getByRole('button', { name: 'Move to Under Review' }).click();
    await expect(page.getByText('Moved to Under Review', { exact: true })).toBeVisible();
    await expectNoSeriousProblems(page);
    await panel.getByLabel('Move to').selectOption({ label: 'Quote Sent' });
    await panel.getByRole('button', { name: 'Send quote' }).click();
    await expect(panel.getByText('Enter the price in rupees, for example 15000')).toBeVisible();
    await expectNoSeriousProblems(page);

    // A question for the customer, with its error showing.
    await panel.getByLabel('Move to').selectOption({ label: 'Awaiting Customer Information' });
    await panel.getByRole('button', { name: 'Move to Awaiting Customer Information' }).click();
    await expect(panel.getByText(/Write the question/)).toBeVisible();
    await expectNoSeriousProblems(page);
  });

  test('the catalogue forms, empty and with their error messages showing', async ({ page }) => {
    await signInAsAdminQuietly(page);

    await page.goto('/admin/catalogue/categories/new');
    await expect(page.getByRole('heading', { level: 1, name: 'Add a website type' })).toBeVisible();
    await expectNoSeriousProblems(page);
    await page.getByRole('button', { name: 'Add website type' }).click();
    await expect(page.getByText('Enter a title (at least 2 characters)')).toBeVisible();
    await expectNoSeriousProblems(page);

    await page.goto('/admin/catalogue/packages/new');
    await expect(page.getByRole('heading', { level: 1, name: 'Add a package' })).toBeVisible();
    await expectNoSeriousProblems(page);
    await page.getByRole('button', { name: 'Add package' }).click();
    await expect(page.getByText('Enter a name (at least 2 characters)')).toBeVisible();
    await expectNoSeriousProblems(page);

    await page.goto('/admin/catalogue/categories/business-websites');
    await expect(page.getByRole('heading', { level: 1, name: /^Edit/ })).toBeVisible();
    await expectNoSeriousProblems(page);
    await page.goto('/admin/catalogue/packages/professional-website');
    await expect(page.getByRole('heading', { level: 1, name: /^Edit/ })).toBeVisible();
    await expectNoSeriousProblems(page);
  });
});

test.describe("the customer's project page, at each stage", () => {
  test('a question, a quote, a finished project to review, and a completed one', async ({
    page,
  }, testInfo) => {
    test.setTimeout(150_000);
    const email = uniqueEmail('axe-stages', testInfo.project.name);
    await signUpQuietly(page, email, { name: 'Axe Customer' });
    const reference = await sendProjectQuietly(page);
    const view = async () => {
      await signInQuietly(page, email);
      await page.goto(`/account/projects/${reference}`);
      await expect(
        page.getByRole('heading', { level: 1, name: 'Website for my studio' }),
      ).toBeVisible();
    };
    await signOutQuietly(page);

    // Prajzo asks a question: the question, and the box for the answer (with its error showing).
    await adminMovesQuietly(page, reference, { to: 'under-review' });
    await adminMovesQuietly(page, reference, {
      to: 'awaiting-information',
      note: 'Please send your logo and brand colours.',
    });
    await view();
    await expect(
      page.getByRole('heading', { name: 'Prajzo needs something from you' }),
    ).toBeVisible();
    await expectNoSeriousProblems(page);
    await page.getByRole('button', { name: 'Send answer' }).click();
    await expect(page.getByText('Write your answer')).toBeVisible();
    await expectNoSeriousProblems(page);
    await page.getByLabel(/^Your answer/).fill('Logo is on WhatsApp.');
    await page.getByRole('button', { name: 'Send answer' }).click();
    await expect(page.getByText('Your answer was sent')).toBeVisible();
    await expectNoSeriousProblems(page);
    await signOutQuietly(page);

    // A quote: reading it, and both questions that follow (accept, decline).
    await adminMovesQuietly(page, reference, { to: 'under-review' });
    await adminMovesQuietly(page, reference, { to: 'quote-sent', quote: goodQuote });
    await view();
    await expect(page.getByRole('heading', { name: 'Your quote' })).toBeVisible();
    await expectNoSeriousProblems(page);
    await page.getByRole('button', { name: 'Accept this quote' }).click();
    await expect(page.getByText('Accept this quote?')).toBeVisible();
    await expectNoSeriousProblems(page);
    await page.getByRole('button', { name: 'Not yet' }).click();
    await page.getByRole('button', { name: 'Decline this quote' }).click();
    await expect(page.getByText('Decline this quote?')).toBeVisible();
    await expectNoSeriousProblems(page);
    await page.getByRole('button', { name: 'Keep it open' }).click();
    await page.getByRole('button', { name: 'Accept this quote' }).click();
    await page.getByRole('button', { name: 'Yes, accept the quote' }).click();
    await expect(page.getByText('You accepted the quote')).toBeVisible();
    await expectNoSeriousProblems(page);
    await signOutQuietly(page);

    // Ready for review: the choices, and the box for asking for changes (with its error showing).
    await adminMovesQuietly(page, reference, {
      to: 'in-development',
      confirmedDeliveryDate: inDays(14),
    });
    await adminMovesQuietly(page, reference, { to: 'testing' });
    await adminMovesQuietly(page, reference, { to: 'awaiting-review', note: 'Preview is ready.' });
    await view();
    await expect(
      page.getByRole('heading', { name: 'Your project is ready for you to review' }),
    ).toBeVisible();
    await expectNoSeriousProblems(page);
    await page.getByRole('button', { name: 'Ask for changes' }).click();
    await page.getByRole('button', { name: 'Send change request' }).click();
    await expect(
      page.getByText("Tell us what you'd like changed (at least 5 characters)"),
    ).toBeVisible();
    await expectNoSeriousProblems(page);
    await page.getByRole('button', { name: 'Not now' }).click();
    await page.getByRole('button', { name: 'It looks good' }).click();
    await expect(page.getByText('You told us it looks good')).toBeVisible();
    await expectNoSeriousProblems(page);
    await signOutQuietly(page);

    // Completed.
    await adminMovesQuietly(page, reference, { to: 'completed' });
    await view();
    await expect(page.getByText('Your project is complete.')).toBeVisible();
    await expectNoSeriousProblems(page);
  });
});
