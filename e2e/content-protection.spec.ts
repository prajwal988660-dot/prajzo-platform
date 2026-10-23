import { expect, test, type Page } from '@playwright/test';

/**
 * Right-click and image-drag blocking (D-037), in a real browser. playwright.config.ts builds the
 * web app with VITE_PROTECT_CONTENT=true for these tests, the same switch a production build uses.
 *
 * What it proves: the page stops the browser's menu on content and keeps it in form fields.
 * What it doesn't claim: that the code is hidden. Anyone can still open the developer tools.
 */

/** Records, for every right-click, whether the page cancelled it. */
async function recordRightClicks(page: Page) {
  await page.evaluate(() => {
    const answers: boolean[] = [];
    (window as unknown as { rightClicks: boolean[] }).rightClicks = answers;
    // Added after the app's own listener, so it sees the final answer.
    document.addEventListener('contextmenu', (event) => answers.push(event.defaultPrevented));
  });
}

const rightClicks = (page: Page) =>
  page.evaluate(() => (window as unknown as { rightClicks: boolean[] }).rightClicks);

test('the browser menu is blocked on page content but kept in form fields', async ({ page }) => {
  await page.goto('/contact');
  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).toBeVisible();
  await recordRightClicks(page);

  await heading.click({ button: 'right' });
  await page.getByRole('link', { name: 'Services' }).first().click({ button: 'right' });
  await page.getByLabel('Your name').click({ button: 'right' });
  await page.getByLabel('About your project').click({ button: 'right' });

  expect(await rightClicks(page)).toEqual([true, true, false, false]);
  // Right-clicking never navigated anywhere.
  expect(new URL(page.url()).pathname).toBe('/contact');
});

test('images cannot be dragged out of the page', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const prevented = await page.evaluate(() => {
    const image = document.querySelector('header img');
    if (!image) throw new Error('The header has no logo image to test with');
    const event = new Event('dragstart', { bubbles: true, cancelable: true });
    image.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(prevented).toBe(true);
});

test('text can still be selected with the mouse, so it can be copied', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop',
    'Selecting with a mouse click is a desktop gesture',
  );
  await page.goto('/about');
  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).toBeVisible();

  await heading.click({ clickCount: 3 }); // triple-click selects the whole line, as a visitor would
  const selected = await page.evaluate(() => window.getSelection()?.toString().trim() ?? '');

  expect(selected.length).toBeGreaterThan(0);
  expect(selected).toBe(((await heading.textContent()) ?? '').trim());
});
