import { test } from '@playwright/test';

/**
 * Full-page screenshots of every page, for reviewing the design at phone, tablet and desktop
 * widths. Only runs when asked: SCREENSHOTS=1 npm run test:e2e -- screenshots
 * The images are saved in test-results/screens/.
 */
test.skip(!process.env.SCREENSHOTS, 'Set SCREENSHOTS=1 to capture screenshots');

const pages = ['/', '/services', '/how-it-works', '/pricing', '/about', '/contact', '/privacy'];
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
