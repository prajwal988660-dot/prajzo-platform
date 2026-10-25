import { expect, test, type Page } from '@playwright/test';

/**
 * Right-click and image-drag blocking (D-037) on the real production build, where it is on by
 * default. It proves what the blocking does and what it leaves alone; it does not claim the code
 * is hidden, because anyone can still open the developer tools.
 */

/** Sends a context-menu request to an element, and says whether the page cancelled it. */
async function menuIsBlocked(page: Page, selector: string) {
  return page.evaluate((target) => {
    const element = document.querySelector(target);
    if (!element) throw new Error(`Nothing matches ${target}`);
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 });
    element.dispatchEvent(event);
    return event.defaultPrevented;
  }, selector);
}

test.describe('right-click blocking on the production build', () => {
  test('is on for content and off in form fields', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Content: the heading, a link, the page itself.
    expect(await menuIsBlocked(page, 'h1')).toBe(true);
    expect(await menuIsBlocked(page, 'a[href="/services"]')).toBe(true);
    expect(await menuIsBlocked(page, 'main')).toBe(true);
    expect(await menuIsBlocked(page, 'body')).toBe(true);
    // Places where people type keep the browser's own menu (paste, spelling suggestions).
    expect(await menuIsBlocked(page, 'input[type="text"]')).toBe(false);
    expect(await menuIsBlocked(page, 'input[type="email"]')).toBe(false);
    expect(await menuIsBlocked(page, 'textarea')).toBe(false);
    expect(await menuIsBlocked(page, 'select')).toBe(false);
  });

  test('also works with a real right-click, which never navigates anywhere', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const seen: boolean[] = [];
    await page.exposeFunction('recordRightClick', (prevented: boolean) => seen.push(prevented));
    await page.evaluate(() => {
      // Added after the page's own listener, so it sees the final answer.
      document.addEventListener('contextmenu', (event) =>
        (window as unknown as { recordRightClick: (prevented: boolean) => void }).recordRightClick(
          event.defaultPrevented,
        ),
      );
    });

    await page.getByRole('heading', { level: 1 }).click({ button: 'right' });
    await page.getByRole('link', { name: 'Services' }).first().click({ button: 'right' });

    await expect.poll(() => seen).toEqual([true, true]);
    expect(new URL(page.url()).pathname).toBe('/about');
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
});

test.describe('what the blocking leaves alone', () => {
  test('text can still be selected, so it can be copied', async ({ page }) => {
    await page.goto('/about');
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();

    await heading.click({ clickCount: 3 });
    const selected = await page.evaluate(() => window.getSelection()?.toString().trim() ?? '');

    expect(selected).toBe(((await heading.textContent()) ?? '').trim());
  });

  test('the keyboard keeps working: moving between controls, typing, and sending a form', async ({
    page,
  }) => {
    await page.goto('/contact');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // The first Tab goes to the "skip to content" link, as it should, and Tab moves on from there.
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();

    // Typing and the menu key in a field work, and Enter on a button sends the form.
    const name = page.getByLabel(/Your name/);
    await name.focus();
    await page.keyboard.type('Keyboard Only');
    await expect(name).toHaveValue('Keyboard Only');
    expect(await menuIsBlocked(page, 'input[type="text"]')).toBe(false);
    await page.getByLabel(/^Email/).fill('keyboard@example.com');
    await page.getByLabel(/About your project/).fill('Sent without touching the mouse at all.');
    await page.getByLabel(/I agree that Prajzo may contact me/).press('Space');
    await expect(page.getByLabel(/I agree that Prajzo may contact me/)).toBeChecked();
    await page.getByRole('button', { name: 'Send message' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText('Message sent')).toBeVisible();
  });

  test('pasting into a field is not blocked', async ({ page }) => {
    await page.goto('/contact');
    const field = page.getByLabel(/About your project/);
    await expect(field).toBeVisible();
    const prevented = await field.evaluate((element) => {
      const event = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: new DataTransfer(),
      });
      element.dispatchEvent(event);
      return event.defaultPrevented;
    });
    expect(prevented).toBe(false);
  });
});
