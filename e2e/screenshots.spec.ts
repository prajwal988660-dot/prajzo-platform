import { test } from '@playwright/test';
import { sendProjectQuietly, signInAsAdminQuietly, signUpQuietly, uniqueEmail } from './helpers';

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
  '/start-project',
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

    const shot = async (name: string) => {
      await page.waitForLoadState('networkidle');
      await page.screenshot({
        path: `test-results/screens/${name}-${width}.png`,
        fullPage: true,
      });
    };

    await signUpQuietly(page, uniqueEmail('shots', testInfo.project.name), { name: 'Asha Rao' });

    // The form, empty and then with its error messages showing.
    await page.goto('/start-project?type=business-websites');
    await page.getByLabel(/^Project name/).waitFor();
    await shot('start-project-signed-in');
    await page.getByRole('button', { name: 'Send project request' }).click();
    await page.getByText('Give your project a short name (at least 3 characters)').waitFor();
    await shot('start-project-errors');

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

    await page.goto('/account');
    await page.getByRole('link', { name: /Online shop for handmade soap/ }).waitFor();
    await shot('account');

    await page.goto('/account/projects');
    await page.getByRole('link', { name: /Website for my studio/ }).waitFor();
    await shot('my-projects');

    await page.goto(`/account/projects/${reference}`);
    await page.getByRole('heading', { name: 'Timeline' }).waitFor();
    await shot('project');
    await page.getByRole('button', { name: 'Cancel this project' }).click();
    await page.getByText('Are you sure you want to cancel this project?').waitFor();
    await shot('project-cancel-question');
    await page.getByRole('button', { name: 'Yes, cancel this project' }).click();
    await page.getByText('Your project has been cancelled').waitFor();
    await shot('project-cancelled');

    await page.request.post('/api/v1/auth/logout');
    await signInAsAdminQuietly(page);
    await page.goto('/admin');
    await page.getByRole('heading', { name: 'Needs you now' }).waitFor();
    await shot('admin');
  });
}
