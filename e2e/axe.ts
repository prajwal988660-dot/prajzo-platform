import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/**
 * Checks the page as it is right now against WCAG 2.2 AA. Serious and critical problems fail the
 * test, listed by rule and element so they are easy to find.
 */
export async function expectNoSeriousProblems(page: Page) {
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
}
