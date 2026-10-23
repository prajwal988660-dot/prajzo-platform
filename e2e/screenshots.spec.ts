import { test } from '@playwright/test';
import { signInAsAdminQuietly, signUpQuietly, uniqueEmail } from './helpers';

/**
 * Full-page screenshots of every page, for reviewing the design at phone, tablet and desktop
 * widths. Only runs when asked: SCREENSHOTS=1 npm run test:e2e -- screenshots
 * The images are saved in test-results/screens/.
 */
test.skip(!process.env.SCREENSHOTS, 'Set SCREENSHOTS=1 to capture screenshots');

const pages = [
  '/',
  '/services',
  '/how-it-works',
  '/pricing',
  '/about',
  '/contact',
  '/privacy',
  '/login',
  '/register',
  '/forgot-password',
  '/admin/login',
];
const widths = [390, 768, 1280];

for (const width of widths) {
  test(`screenshots at ${width}px`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'One run is enough');
    await page.setViewportSize({ width, height: 900 });
    for (const path of pages) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const name = path === '/' ? 'home' : path.slice(1);
      await page.screenshot({ path: `test-results/screens/${name}-${width}.png`, fullPage: true });
    }
  });
}

// The pages that need someone signed in.
for (const width of widths) {
  test(`signed-in screenshots at ${width}px`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'One run is enough');
    await page.setViewportSize({ width, height: 900 });

    await signUpQuietly(page, uniqueEmail('shots', testInfo.project.name), { name: 'Asha Rao' });
    await page.goto('/account');
    await page.getByRole('heading', { level: 1 }).waitFor();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `test-results/screens/account-${width}.png`, fullPage: true });

    await page.request.post('/api/v1/auth/logout');
    await signInAsAdminQuietly(page);
    await page.goto('/admin');
    await page.getByText('Customers', { exact: true }).waitFor();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `test-results/screens/admin-${width}.png`, fullPage: true });
  });
}
