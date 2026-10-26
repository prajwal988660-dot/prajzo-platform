import { expect, test, type Page } from '@playwright/test';
import { sendProjectQuietly, signUpQuietly, strongPassword, uniqueEmail } from './helpers';

/**
 * Everything a person who can't use a mouse (or prefers not to) does, with the keyboard only: the
 * link that skips the header, the order of the Tab key, the phone menu, where focus lands after
 * moving to another page or to the next page of a list, and signing in. Runs on a computer and on
 * a phone-sized screen.
 */

/** What currently has keyboard focus, in a form that is easy to read in a failure. */
const focused = (page: Page) =>
  page.evaluate(() => {
    const element = document.activeElement;
    if (!element || element === document.body) return 'nothing';
    const text = (element.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);
    const name =
      element.getAttribute('aria-label') ??
      (text || element.querySelector('img')?.getAttribute('alt') || '');
    return `${element.tagName.toLowerCase()}: ${name}`;
  });

/** Whether what has focus can be seen: an outline, a ring or a changed background. */
const focusIsVisible = (page: Page) =>
  page.evaluate(() => {
    const element = document.activeElement;
    if (!element) return false;
    const style = getComputedStyle(element);
    const outline = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0;
    const ring = style.boxShadow !== 'none';
    return outline || ring;
  });

test('the first Tab offers to skip the header, and using it moves to the content', async ({
  page,
}) => {
  await page.goto('/services');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to main content' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible(); // it shows up when focused

  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  // The next Tab goes to the first thing in the content, not back into the header.
  await page.keyboard.press('Tab');
  expect(await focused(page)).not.toMatch(/Services|Pricing|Prajzo/);
  expect(
    await page.evaluate(() => document.activeElement?.closest('main') !== null),
    'focus is inside the main content',
  ).toBe(true);
});

test('Tab visits the header in reading order and always shows where focus is', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'The long menu is a phone menu: see below');
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  // "Sign in" appears once the site has checked whether anyone is signed in.
  await expect(page.getByRole('banner').getByRole('link', { name: 'Sign in' })).toBeVisible();

  const stops: string[] = [];
  for (let step = 0; step < 11; step += 1) {
    await page.keyboard.press('Tab');
    stops.push(await focused(page));
    expect(await focusIsVisible(page), `stop ${step + 1}: ${stops.at(-1)}`).toBe(true);
  }

  expect(stops.slice(0, 9)).toEqual([
    'a: Skip to main content',
    'a: Prajzo home',
    'a: Home',
    'a: Services',
    'a: How It Works',
    'a: Pricing',
    'a: Contact',
    'a: Sign in',
    'a: Start a Project',
  ]);
  // Then the page itself, starting with its own links and buttons.
  expect(stops[9]).toMatch(/^a: /);
});

test('moving to another page with the keyboard puts focus on its heading', async ({
  page,
  isMobile,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  if (isMobile) {
    await page.getByRole('button', { name: 'Open menu' }).focus();
    await page.keyboard.press('Enter');
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'Pricing' })
      .focus();
  } else {
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'Pricing' })
      .focus();
  }
  await page.keyboard.press('Enter');

  const heading = page.getByRole('heading', {
    level: 1,
    name: 'Affordable prices, agreed up front',
  });
  await expect(heading).toBeFocused();
  // The page was not scrolled down by it, and Tab carries on from the heading into the page.
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.activeElement?.closest('main') !== null)).toBe(true);
});

test('following a link inside a page also puts focus on the new page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'View services' }).focus();
  await page.keyboard.press('Enter');

  await expect(
    page.getByRole('heading', { level: 1, name: 'Websites and web apps for every need' }),
  ).toBeFocused();
});

test.describe('the phone menu', () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(!isMobile, 'Only phones show this menu');
  });

  test('opens and closes from the keyboard, and gives focus back to its button', async ({
    page,
  }) => {
    await page.goto('/');
    const button = page.getByRole('button', { name: 'Open menu' });
    await button.focus();

    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Close menu' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    // Focus goes into the menu, to its first link.
    await expect(
      page.getByRole('navigation', { name: 'Main' }).getByRole('link').first(),
    ).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Open menu' })).toBeFocused();
    await expect(page.getByRole('button', { name: 'Open menu' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0);
  });

  test('Tab moves through its links in order, and choosing one closes it', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Open menu' }).focus();
    await page.keyboard.press('Enter');

    const order: string[] = [];
    for (let step = 0; step < 5; step += 1) {
      order.push(await focused(page));
      await page.keyboard.press('Tab');
    }
    expect(order).toEqual([
      'a: Home',
      'a: Services',
      'a: How It Works',
      'a: Pricing',
      'a: Contact',
    ]);

    await page.keyboard.press('Shift+Tab'); // back to Contact
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { level: 1, name: 'Talk to us' })).toBeFocused();
    await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0);
  });
});

test('the next page of a list takes focus to the list, and Tab then starts with its first item', async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  await signUpQuietly(page, uniqueEmail('keyboard-list', testInfo.project.name));
  // One more than fits on a page (10).
  for (let index = 1; index <= 11; index += 1) {
    await sendProjectQuietly(page, {
      title: `Keyboard test project ${String(index).padStart(2, '0')}`,
    });
  }

  await page.goto('/account/projects');
  const list = page.getByRole('list', { name: 'Your projects' });
  await expect(list.getByRole('listitem')).toHaveCount(10);

  await page.getByRole('link', { name: 'Next' }).focus();
  await page.keyboard.press('Enter');

  await expect(page.getByText('Page 2 of 2')).toBeVisible();
  await expect(list).toBeFocused();
  await expect(list.getByRole('listitem')).toHaveCount(1);
  await page.keyboard.press('Tab');
  await expect(list.getByRole('link').first()).toBeFocused();

  // And back again, the same way.
  await page.getByRole('link', { name: 'Previous' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Page 1 of 2')).toBeVisible();
  await expect(list).toBeFocused();
});

test('signing in works with the keyboard alone, and lands on the account page', async ({
  page,
  request,
}, testInfo) => {
  const email = uniqueEmail('keyboard-signin', testInfo.project.name);
  const created = await request.post('/api/v1/auth/register', {
    data: { name: 'Keyboard Visitor', email, password: strongPassword, acceptTerms: true },
  });
  expect(created.status()).toBe(201);

  await page.goto('/login');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.getByRole('textbox', { name: /^Email/ }).focus();
  await page.keyboard.type(email);
  await page.keyboard.press('Tab');
  await page.keyboard.type(strongPassword);
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
});
