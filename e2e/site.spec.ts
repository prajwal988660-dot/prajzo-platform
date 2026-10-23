import { expect, test, type Page } from '@playwright/test';

async function openMainNavigation(page: Page, isMobile: boolean) {
  if (isMobile) await page.getByRole('button', { name: 'Open menu' }).click();
  return page.getByRole('navigation', { name: 'Main' });
}

test('the home page shows services and packages from the API', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { level: 1, name: 'Your Idea. Your Design. Our Development.' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Forms and Landing Pages' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'See all 15 services' })).toBeVisible();
  const packages = page.getByRole('region', { name: 'Simple, affordable starting prices' });
  await expect(packages.getByText('₹2,999')).toBeVisible();
  await expect(packages.getByText('₹7,999')).toBeVisible();
  await expect(packages.getByText('₹19,999')).toBeVisible();
});

test('every main page can be reached from the navigation', async ({ page, isMobile }) => {
  await page.goto('/');
  const destinations = [
    ['Services', 'Websites and web apps for every need'],
    ['How It Works', 'A clear path from idea to launch'],
    ['Pricing', 'Affordable prices, agreed up front'],
    ['Contact', 'Talk to us'],
    ['Home', 'Your Idea. Your Design. Our Development.'],
  ] as const;

  for (const [link, heading] of destinations) {
    const navigation = await openMainNavigation(page, isMobile);
    await navigation.getByRole('link', { name: link, exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
  }
});

test('the services page lists all 15 kinds of website', async ({ page }) => {
  await page.goto('/services');
  await expect(page.getByRole('article')).toHaveCount(15);
  await expect(page.getByRole('heading', { name: 'Custom Website Development' })).toBeVisible();
});

test('a package\'s "Get a quote" opens Start a Project, remembering the package', async ({
  page,
}) => {
  await page.goto('/pricing');
  await page.getByRole('link', { name: 'Get a quote for Professional Website' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Tell us about your project' }),
  ).toBeVisible();
  await expect(page).toHaveURL('/start-project?package=professional-website');
  // A visitor is asked to sign in first, and the package comes back with them afterwards.
  await expect(page.getByRole('link', { name: 'Create a free account' })).toHaveAttribute(
    'href',
    '/register?next=%2Fstart-project%3Fpackage%3Dprofessional-website',
  );
});

test('the footer links to the legal pages and contact details', async ({ page }) => {
  await page.goto('/');
  const footer = page.getByRole('contentinfo');
  await expect(footer.getByRole('link', { name: 'contact@prajzo.com' })).toBeVisible();
  await footer.getByRole('link', { name: 'Privacy Policy' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeVisible();
  await page.getByRole('contentinfo').getByRole('link', { name: 'Terms and Conditions' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Terms and Conditions' })).toBeVisible();
});

test('unknown addresses show the 404 page', async ({ page }) => {
  await page.goto('/this-page-does-not-exist');
  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
  await page.getByRole('link', { name: 'Back to the home page' }).click();
  await expect(page).toHaveURL('/');
});

test('no page scrolls sideways', async ({ page }) => {
  for (const path of [
    '/',
    '/services',
    '/how-it-works',
    '/pricing',
    '/about',
    '/contact',
    '/privacy',
    '/terms',
  ]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${path} is wider than the screen`).toBeLessThanOrEqual(0);
  }
});
