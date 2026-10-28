import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import {
  adminMovesQuietly,
  goodQuote,
  sendContactMessageQuietly,
  sendProjectQuietly,
  signInAsAdminQuietly,
  signInQuietly,
  signOutQuietly,
  signUpQuietly,
  uniqueEmail,
} from './helpers';

/**
 * Every page at the widths people really use: a small phone (320), a normal phone (390), a tablet
 * (768) and a laptop (1280). On each, nothing may make the page scroll sideways, and nothing may
 * stick out past the edge of the screen unless it sits inside something that scrolls on purpose
 * (such as the admin menu on a phone).
 *
 * Set SCREENSHOT_DIR to a folder to also save a picture of every page at every width, for looking
 * at the design: SCREENSHOT_DIR=... npm run test:e2e -- responsive
 */

const widths = [320, 390, 768, 1280];

/** What a visitor can type: a long web address or word with no spaces, which won't wrap on its own. */
const longWord = (length: number) =>
  'Averyveryverylongunbrokenwordwithoutanyspaces'.repeat(Math.ceil(length / 45)).slice(0, length);

/** Fails, naming each culprit, if the page is wider than the screen or something sticks out of it. */
async function expectFitsTheScreen(page: Page, label: string) {
  const problems = await page.evaluate(() => {
    const viewport = document.documentElement.clientWidth;
    const found: string[] = [];

    const sideways = document.documentElement.scrollWidth - viewport;
    if (sideways > 0) found.push(`the page scrolls sideways by ${sideways}px`);

    const describe = (element: Element) => {
      const classes =
        typeof element.className === 'string' && element.className.trim()
          ? `.${element.className.trim().split(/\s+/).slice(0, 3).join('.')}`
          : '';
      return `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}${classes}`;
    };
    /** Inside something that clips or scrolls its content and itself fits the screen. */
    const isContained = (element: Element) => {
      for (let parent = element.parentElement; parent && parent !== document.body;) {
        if (getComputedStyle(parent).overflowX !== 'visible') {
          const box = parent.getBoundingClientRect();
          if (box.right <= viewport + 1 && box.left >= -1) return true;
        }
        parent = parent.parentElement;
      }
      return false;
    };

    for (const element of document.querySelectorAll('body *')) {
      const style = getComputedStyle(element);
      if (style.position === 'fixed' || style.display === 'none' || style.visibility === 'hidden') {
        continue;
      }
      // Hidden on purpose, such as the form's spam trap that is placed far off the screen.
      if (element.closest('[aria-hidden="true"]')) continue;
      const box = element.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      if ((box.right > viewport + 1 || box.left < -1) && !isContained(element)) {
        found.push(
          `${describe(element)} reaches ${Math.round(box.left)} to ${Math.round(box.right)} on a ${viewport}px screen`,
        );
        if (found.length >= 8) break;
      }
    }
    return found;
  });
  // Soft, so that every page that is too wide is reported in one run, not only the first.
  expect.soft(problems, label).toEqual([]);
}

for (const width of widths) {
  test(`every page fits a ${width}px wide screen`, async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'The widths are set here, one run is enough');
    test.setTimeout(240_000);
    await page.setViewportSize({ width, height: 800 });
    const folder = process.env.SCREENSHOT_DIR;

    let visited = 0;
    const check = async (address: string, name: string) => {
      await page.goto(address);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await page.waitForLoadState('networkidle');
      await expectFitsTheScreen(page, `${address} at ${width}px`);
      if (folder) {
        await page.screenshot({ path: path.join(folder, `${name}-${width}.png`), fullPage: true });
      }
      visited += 1;
    };

    // ---- Everyone
    for (const address of [
      '/',
      '/services',
      '/how-it-works',
      '/pricing',
      '/about',
      '/contact',
      '/start-project',
      '/privacy',
      '/terms',
      '/demo/portfolio',
      '/demo/business',
      '/demo/event',
      '/templates/event',
      '/templates/business',
      '/templates',
      '/templates/portfolio',
      '/projects',
      '/build',
      '/build?template=portfolio',
      '/login',
      '/register',
      '/forgot-password',
      '/reset-password?token=abcdefghijklmnopqrstuvwxyz0123456789',
      '/admin/login',
      '/page-that-does-not-exist',
    ]) {
      await check(address, address === '/' ? 'home' : (address.slice(1).split('?')[0] ?? 'page'));
    }

    // ---- A customer with long names and long notes, which are what break layouts.
    const email = uniqueEmail('responsive', testInfo.project.name);
    await signUpQuietly(page, email, { name: `Asha ${longWord(60)}` });
    const reference = await sendProjectQuietly(page, {
      title: `A long project name ${longWord(70)}`,
      notes: `Please message me after 5 pm. ${longWord(300)} https://example.com/${longWord(120)}`,
      features: ['gallery', 'contact-form'],
      integrations: ['google-maps'],
      packageKey: 'professional-website',
      contactPreference: 'whatsapp',
      phone: '+91 98866 07720',
    });
    await sendProjectQuietly(page, {
      title: 'Online shop for handmade soap',
      categoryKey: 'ecommerce',
    });
    await sendContactMessageQuietly(request, `Ravi ${longWord(50)}`, {
      email: `a-very-long-email-address-for-testing-${longWord(40)}@a-very-long-domain-name-example.com`,
      message: `Hello! I would like a website for my sweet shop. ${longWord(300)} https://example.com/${longWord(100)}`,
    });
    await signOutQuietly(page);
    await adminMovesQuietly(page, reference, { to: 'under-review' });
    await adminMovesQuietly(page, reference, {
      to: 'quote-sent',
      quote: { ...goodQuote, scope: `${goodQuote.scope} ${longWord(160)}` },
      note: `Thank you for your patience! ${longWord(120)}`,
    });

    await signInQuietly(page, email);
    await check('/start-project?type=business-websites', 'start-project-signed-in');
    await check('/account', 'account');
    await check('/account/projects', 'my-projects');
    await check(`/account/projects/${reference}`, 'my-project-quote');
    await signOutQuietly(page);

    // ---- The administrator
    await signInAsAdminQuietly(page);
    const note = await page.request.post(`/api/v1/admin/project-requests/${reference}/notes`, {
      data: { text: `Called on WhatsApp: she prefers a blue theme. ${longWord(200)}` },
    });
    expect(note.ok(), await note.text()).toBe(true);
    await check('/admin', 'admin-overview');
    await check('/admin/projects', 'admin-projects');
    await check(`/admin/projects/${reference}`, 'admin-project');
    await check('/admin/customers', 'admin-customers');
    await page
      .getByRole('link', { name: /^Asha / })
      .first()
      .click();
    await expect(page.getByRole('heading', { level: 1, name: /^Asha / })).toBeVisible();
    await page.waitForLoadState('networkidle');
    await expectFitsTheScreen(page, `an admin customer page at ${width}px`);
    if (folder) {
      await page.screenshot({
        path: path.join(folder, `admin-customer-${width}.png`),
        fullPage: true,
      });
    }
    await check('/admin/messages', 'admin-messages');
    await check('/admin/catalogue', 'admin-catalogue');
    await check('/admin/catalogue/packages/professional-website', 'admin-package-edit');
    await check('/admin/catalogue/categories/new', 'admin-category-new');
    await check('/admin/activity', 'admin-activity');
    await signOutQuietly(page);

    expect(visited).toBeGreaterThanOrEqual(25);
  });
}
