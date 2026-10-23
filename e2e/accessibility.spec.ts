import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const pages = [
  '/',
  '/services',
  '/how-it-works',
  '/pricing',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/page-that-does-not-exist',
];

for (const path of pages) {
  test(`${path} has no serious accessibility problems`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    const serious = results.violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical',
    );

    expect(
      serious.map((violation) => ({
        rule: violation.id,
        help: violation.help,
        elements: violation.nodes.map((node) => node.target.join(' ')),
      })),
    ).toEqual([]);
  });
}
