import { expect, test } from '@playwright/test';

/**
 * Browser crash reports (D-058) on the real production build, where they are on. The strict
 * content security policy, the origin check and (on staging) the password all sit between the
 * page and the API, so only a real browser shows the report gets through.
 */
test.describe('browser error reports on the production build', () => {
  test('an error nothing caught reaches the server, with the path only', async ({ page }) => {
    await page.goto('/reset-password?token=not-a-real-token#top');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const reported = page.waitForRequest('**/api/v1/client-errors');
    await page.evaluate(() => {
      setTimeout(() => {
        throw new Error('Probe from the production test');
      });
    });
    const request = await reported;
    const response = await request.response();

    expect(response?.status()).toBe(204);
    const body = request.postDataJSON() as Record<string, unknown>;
    expect(body).toMatchObject({
      kind: 'error',
      message: 'Error: Probe from the production test',
      page: '/reset-password',
    });
    expect(request.postData()).not.toContain('not-a-real-token');
  });

  test('a promise nobody handled is reported once, however often it happens', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const sent: string[] = [];
    page.on('request', (request) => {
      if (request.url().endsWith('/api/v1/client-errors')) sent.push(request.postData() ?? '');
    });
    const first = page.waitForResponse('**/api/v1/client-errors');
    await page.evaluate(() => {
      for (let index = 0; index < 3; index += 1) void Promise.reject(new Error('Same rejection'));
    });
    expect((await first).status()).toBe(204);
    // Give any duplicates time to be sent before counting.
    await page.waitForTimeout(500);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toContain('unhandledrejection');
  });
});
