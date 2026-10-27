import { expect, test, type APIResponse } from '@playwright/test';
import { signInAsAdminQuietly, signUpQuietly, strongPassword, uniqueEmail } from '../e2e/helpers';

/**
 * The sign-in cookie on the real production build (D-051): what the server sends, what a real
 * browser keeps, and what happens when someone tries to plant or keep one. Runs against the live
 * server, which believes it is behind a host's proxy that handles https.
 */

const name = '__Host-prajzo.sid';
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** Every Set-Cookie line of an answer. */
const cookieLines = (response: APIResponse) =>
  response
    .headersArray()
    .filter((header) => header.name.toLowerCase() === 'set-cookie')
    .map((header) => header.value);

/** The session cookie's line, or undefined. */
const sessionLine = (response: APIResponse) =>
  cookieLines(response).find((line) => line.startsWith(`${name}=`));

/** How long from now the cookie lasts, in milliseconds. */
function lifetime(line: string): number {
  const expires = /;\s*Expires=([^;]+)/i.exec(line)?.[1];
  expect(expires, `no Expires in: ${line}`).toBeTruthy();
  return Date.parse(expires ?? '') - Date.now();
}

const registration = (label: string) => ({
  data: {
    name: 'Cookie Check',
    email: uniqueEmail(label, 'live'),
    password: strongPassword,
    acceptTerms: true,
  },
});

test.describe('the sign-in cookie, as the server sends it', () => {
  test('is locked to this exact site, hidden from scripts and not sent with other sites requests', async ({
    request,
  }) => {
    const response = await request.post('/api/v1/auth/register', registration('attributes'));
    expect(response.status()).toBe(201);

    const line = sessionLine(response) ?? '';
    expect(line).toMatch(/^__Host-prajzo\.sid=s%3A/); // the prefix, and a signed value
    expect(line).toMatch(/;\s*Secure\b/i);
    expect(line).toMatch(/;\s*HttpOnly\b/i);
    expect(line).toMatch(/;\s*SameSite=Lax\b/i);
    expect(line).toMatch(/;\s*Path=\/(;|$)/i); // the whole site
    expect(line).not.toMatch(/Domain=/i); // this exact address only, not its sub-addresses
    // Signing in sets that cookie and nothing else.
    expect(cookieLines(response)).toHaveLength(1);
  });

  test('lasts about two weeks for a customer, and hours for an administrator', async ({
    request,
  }) => {
    const customer = await request.post('/api/v1/auth/register', registration('lifetime'));
    expect(lifetime(sessionLine(customer) ?? '')).toBeGreaterThan(13.9 * DAY);
    expect(lifetime(sessionLine(customer) ?? '')).toBeLessThan(14.1 * DAY);

    const admin = await request.post('/api/v1/auth/admin/login', {
      data: {
        email: process.env.E2E_ADMIN_EMAIL,
        password: process.env.E2E_ADMIN_PASSWORD,
      },
    });
    expect(admin.status()).toBe(200);
    expect(lifetime(sessionLine(admin) ?? '')).toBeGreaterThan(7.9 * HOUR);
    expect(lifetime(sessionLine(admin) ?? '')).toBeLessThan(8.1 * HOUR);
  });

  test('is never handed out to visitors who have not signed in', async ({ request }) => {
    for (const address of [
      '/',
      '/pricing',
      '/admin/login',
      '/api/v1/categories',
      '/api/v1/auth/me',
      '/api/health',
      '/no/such/page',
    ]) {
      expect(cookieLines(await request.get(address)), address).toEqual([]);
    }

    // Nor for a wrong password, or a form with mistakes.
    const wrong = await request.post('/api/v1/auth/login', {
      data: { email: 'nobody@example.com', password: 'not-the-password-1' },
    });
    expect(wrong.status()).toBe(401);
    expect(cookieLines(wrong)).toEqual([]);
    const mistakes = await request.post('/api/v1/auth/register', { data: { email: 'x' } });
    expect(mistakes.status()).toBe(400);
    expect(cookieLines(mistakes)).toEqual([]);
  });
});

test.describe('the sign-in cookie, in a real browser', () => {
  test('is kept as a secure, host-only cookie that scripts cannot see, and signs the person in', async ({
    page,
  }) => {
    await page.goto('/');
    await signUpQuietly(page, uniqueEmail('browser', 'live'));

    const cookie = (await page.context().cookies()).find((item) => item.name === name);
    expect(cookie, 'the browser kept the cookie').toBeDefined();
    expect(cookie).toMatchObject({ httpOnly: true, secure: true, sameSite: 'Lax', path: '/' });
    expect(cookie?.domain).toBe('localhost'); // no leading dot: this exact address only
    expect((cookie?.expires ?? 0) * 1000 - Date.now()).toBeGreaterThan(13.9 * DAY);

    // Page scripts can't read it...
    expect(await page.evaluate(() => document.cookie)).toBe('');
    // ...yet the browser sends it, so the site knows who this is.
    const me = await page.request.get('/api/v1/auth/me');
    expect(((await me.json()) as { user: { role: string } | null }).user?.role).toBe('customer');
    await page.goto('/account');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page).toHaveURL(/\/account$/); // not sent to the sign-in page
  });

  test('a cookie planted under the plain name signs nobody in', async ({
    page,
    playwright,
    baseURL,
  }) => {
    await page.goto('/');
    await signUpQuietly(page, uniqueEmail('planted', 'live'));
    const real = (await page.context().cookies()).find((item) => item.name === name)?.value ?? '';
    expect(real).not.toBe('');

    const asVisitor = async (cookieName: string) => {
      const context = await playwright.request.newContext({
        baseURL,
        extraHTTPHeaders: { 'X-Forwarded-Proto': 'https', Cookie: `${cookieName}=${real}` },
      });
      const answer = await context.get('/api/v1/auth/me');
      const body = (await answer.json()) as { user: unknown };
      await context.dispose();
      return body.user;
    };

    // Control: the same value under the right name does sign the person in, so the check below means something.
    expect(await asVisitor(name)).not.toBeNull();
    // A sibling address that managed to set a cookie under the old, plain name gets nowhere.
    expect(await asVisitor('prajzo.sid')).toBeNull();
  });

  test('signing out tells the browser to delete it, and the sign-in is really over', async ({
    page,
  }) => {
    await page.goto('/');
    await signUpQuietly(page, uniqueEmail('signout', 'live'));
    expect((await page.context().cookies()).some((item) => item.name === name)).toBe(true);

    const out = await page.request.post('/api/v1/auth/logout');
    expect(out.status()).toBe(204);

    // Deleted with the same attributes it was set with (a __Host- cookie can't be changed otherwise).
    const line = cookieLines(out).find((item) => item.startsWith(`${name}=;`)) ?? '';
    expect(line).toMatch(/;\s*Path=\/(;|$)/i);
    expect(line).toMatch(/;\s*Secure\b/i);
    expect(line).toMatch(/;\s*HttpOnly\b/i);
    expect(lifetime(line)).toBeLessThan(0);
    expect((await page.context().cookies()).some((item) => item.name === name)).toBe(false);
    const me = await page.request.get('/api/v1/auth/me');
    expect(((await me.json()) as { user: unknown }).user).toBeNull();
  });

  test('an administrator gets the same kind of cookie, and can use it', async ({ page }) => {
    await page.goto('/');
    await signInAsAdminQuietly(page);

    const cookie = (await page.context().cookies()).find((item) => item.name === name);
    expect(cookie).toMatchObject({ httpOnly: true, secure: true, sameSite: 'Lax', path: '/' });
    expect((cookie?.expires ?? 0) * 1000 - Date.now()).toBeLessThan(8.1 * HOUR);
    const overview = await page.request.get('/api/v1/admin/overview');
    expect(overview.status()).toBe(200);
  });
});
