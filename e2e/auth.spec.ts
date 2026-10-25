import { expect, test } from '@playwright/test';
import {
  adminEmail,
  adminPassword,
  lastEmailTo,
  newPassword,
  openMenuIfMobile,
  signInAsAdminQuietly,
  signOutFromHeader,
  signUpQuietly,
  strongPassword,
  uniqueEmail,
} from './helpers';

test.describe('customer accounts', () => {
  test('a visitor can create an account, sign out, and sign back in', async ({
    page,
    isMobile,
  }, testInfo) => {
    const email = uniqueEmail('journey', testInfo.project.name);

    await page.goto('/register');
    await page.getByLabel(/^Your name/).fill('Ravi Kumar');
    await page.getByLabel(/^Email/).fill(email);
    await page.getByLabel(/^Password/).fill(strongPassword);
    await page.getByLabel(/I agree to the/).check();
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page).toHaveURL('/account');
    await expect(page.getByRole('heading', { level: 1, name: 'Welcome, Ravi' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'No projects yet' })).toBeVisible();

    await signOutFromHeader(page, isMobile);
    await expect(page).toHaveURL('/');
    await openMenuIfMobile(page, isMobile);
    await expect(page.getByRole('banner').getByRole('link', { name: 'Sign in' })).toBeVisible();

    await page.goto('/login');
    await page.getByLabel(/^Email/).fill(email);
    await page.getByLabel(/^Password/).fill(strongPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/account');
    await expect(page.getByRole('heading', { level: 1, name: 'Welcome, Ravi' })).toBeVisible();
  });

  test('being signed in survives a page reload', async ({ page }, testInfo) => {
    await signUpQuietly(page, uniqueEmail('reload', testInfo.project.name), { name: 'Meera Nair' });

    await page.goto('/account');
    await expect(page.getByRole('heading', { level: 1, name: 'Welcome, Meera' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Welcome, Meera' })).toBeVisible();
  });

  test('wrong details are refused with a clear message, and nobody is signed in', async ({
    page,
  }, testInfo) => {
    const email = uniqueEmail('wrong', testInfo.project.name);
    await signUpQuietly(page, email);
    await page.request.post('/api/v1/auth/logout');

    await page.goto('/login');
    await page.getByLabel(/^Email/).fill(email);
    await page.getByLabel(/^Password/).fill('not-the-right-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByRole('alert')).toContainText("That email and password don't match");
    await expect(page).toHaveURL('/login');
    await page.goto('/account');
    await expect(page).toHaveURL(/\/login\?next=%2Faccount$/);
  });

  test('a private page asks for sign-in, then returns the visitor to it', async ({
    page,
  }, testInfo) => {
    const email = uniqueEmail('next', testInfo.project.name);
    await signUpQuietly(page, email);
    await page.request.post('/api/v1/auth/logout');

    await page.goto('/account');
    await expect(page).toHaveURL(/\/login\?next=%2Faccount$/);
    await page.getByLabel(/^Email/).fill(email);
    await page.getByLabel(/^Password/).fill(strongPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL('/account');
  });

  test('refuses a second account with the same email, next to the email field', async ({
    page,
  }, testInfo) => {
    const email = uniqueEmail('duplicate', testInfo.project.name);
    await signUpQuietly(page, email);
    await page.request.post('/api/v1/auth/logout');

    await page.goto('/register');
    await page.getByLabel(/^Your name/).fill('Someone Else');
    await page.getByLabel(/^Email/).fill(email);
    await page.getByLabel(/^Password/).fill(strongPassword);
    await page.getByLabel(/I agree to the/).check();
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByText(/Try signing in instead/)).toBeVisible();
    await expect(page).toHaveURL('/register');
  });

  test('can change their name and see it straight away', async ({ page }, testInfo) => {
    await signUpQuietly(page, uniqueEmail('profile', testInfo.project.name), { name: 'Old Name' });

    await page.goto('/account');
    await page.getByLabel(/^Your name/).fill('Zed Tester');
    await page.getByRole('button', { name: 'Save details' }).click();

    await expect(page.getByText('Your details have been updated.')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Welcome, Zed' })).toBeVisible();
  });

  test('can change their password, and then sign in only with the new one', async ({
    page,
    isMobile,
  }, testInfo) => {
    const email = uniqueEmail('password', testInfo.project.name);
    await signUpQuietly(page, email);

    await page.goto('/account');
    await page.getByLabel(/^Current password/).fill(strongPassword);
    await page.getByLabel(/^New password/).fill(newPassword);
    await page.getByRole('main').getByRole('button', { name: 'Change password' }).click();
    await expect(page.getByText(/Other devices have been signed out/)).toBeVisible();

    await signOutFromHeader(page, isMobile);
    await page.goto('/login');
    await page.getByLabel(/^Email/).fill(email);
    await page.getByLabel(/^Password/).fill(strongPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toContainText("don't match");

    await page.getByLabel(/^Password/).fill(newPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/account');
  });
});

test.describe('forgotten password', () => {
  test('the emailed link lets a customer choose a new password and sign in with it', async ({
    page,
    request,
  }, testInfo) => {
    const email = uniqueEmail('reset', testInfo.project.name);
    await signUpQuietly(page, email);
    await page.request.post('/api/v1/auth/logout');

    await page.goto('/forgot-password');
    await page.getByLabel(/^Email/).fill(email);
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(page.getByText('Check your email')).toBeVisible();

    const mail = await lastEmailTo(request, email);
    expect(mail.subject).toBe('Reset your Prajzo password');
    const link = /https?:\/\/[^\s]+\/reset-password\?token=[\w-]+/.exec(mail.text)?.[0];
    expect(link).toBeTruthy();
    // The link names the public address; open it on the address the test browser uses.
    await page.goto(new URL(link ?? '').pathname + new URL(link ?? '').search);

    await page.getByLabel(/^New password/).fill(newPassword);
    await page.getByRole('button', { name: 'Change password' }).click();
    await expect(page.getByText('Your password has been changed')).toBeVisible();

    await page.getByRole('main').getByRole('link', { name: 'Sign in' }).click();
    await page.getByLabel(/^Email/).fill(email);
    await page.getByLabel(/^Password/).fill(newPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/account');

    // The same link cannot be used again.
    await page.request.post('/api/v1/auth/logout');
    await page.goto(new URL(link ?? '').pathname + new URL(link ?? '').search);
    await page.getByLabel(/^New password/).fill('yet-another-passphrase-7');
    await page.getByRole('button', { name: 'Change password' }).click();
    await expect(page.getByRole('alert')).toContainText('invalid or has expired');
  });

  test('says the same thing for an email that has no account, and sends nothing', async ({
    page,
    request,
  }, testInfo) => {
    const email = uniqueEmail('nobody', testInfo.project.name);

    await page.goto('/forgot-password');
    await page.getByLabel(/^Email/).fill(email);
    await page.getByRole('button', { name: 'Send reset link' }).click();

    await expect(page.getByText('Check your email')).toBeVisible();
    const sent = (await (await request.get(`/api/__e2e/emails?to=${email}`)).json()) as unknown[];
    expect(sent).toHaveLength(0);
  });
});

test.describe('administrators', () => {
  test('sign in on their own page, see real numbers, and sign out', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL('/admin/login');

    await page.getByLabel(/^Email/).fill(adminEmail);
    await page.getByLabel(/^Password/).fill(adminPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL('/admin');
    await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Needs you now' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'At a glance' })).toBeVisible();
    // The administration area has its own plain frame.
    await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL('/admin/login');
    await page.goto('/admin');
    await expect(page).toHaveURL('/admin/login');
  });

  test('cannot sign in on the customer page, and a customer cannot sign in on theirs', async ({
    page,
  }, testInfo) => {
    await page.goto('/login');
    await page.getByLabel(/^Email/).fill(adminEmail);
    await page.getByLabel(/^Password/).fill(adminPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toContainText("don't match");

    const email = uniqueEmail('notadmin', testInfo.project.name);
    await signUpQuietly(page, email);
    await page.request.post('/api/v1/auth/logout');
    await page.goto('/admin/login');
    await page.getByLabel(/^Email/).fill(email);
    await page.getByLabel(/^Password/).fill(strongPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toContainText("don't match");
  });

  test('a signed-in customer is turned away from the administration area', async ({
    page,
  }, testInfo) => {
    await signUpQuietly(page, uniqueEmail('turnedaway', testInfo.project.name));

    await page.goto('/admin');
    await expect(
      page.getByRole('heading', { name: "You don't have access to this page" }),
    ).toBeVisible();

    // The server refuses too: hiding the page is not what protects it.
    const response = await page.request.get('/api/v1/admin/overview');
    expect(response.status()).toBe(403);
  });

  test('a signed-in administrator who opens the customer account is sent to the admin area', async ({
    page,
  }) => {
    await signInAsAdminQuietly(page);
    await page.goto('/account');
    await expect(page).toHaveURL('/admin');
  });
});

test.describe('safety', () => {
  test('the session cookie is hidden from page scripts', async ({ page, context }, testInfo) => {
    await signUpQuietly(page, uniqueEmail('cookie', testInfo.project.name));
    await page.goto('/account');

    const visibleToScripts = await page.evaluate(() => document.cookie);
    expect(visibleToScripts).not.toContain('prajzo.sid');

    const cookie = (await context.cookies()).find((item) => item.name === 'prajzo.sid');
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'Lax', path: '/' });
  });

  test('a request that another website started is refused', async ({ request }) => {
    const response = await request.post('/api/v1/auth/login', {
      headers: { Origin: 'https://evil.example' },
      data: { email: adminEmail, password: adminPassword },
    });

    expect(response.status()).toBe(403);
    expect(response.headers()['set-cookie']).toBeUndefined();
  });

  test('private data is never cached by the browser', async ({ page }, testInfo) => {
    await signUpQuietly(page, uniqueEmail('nocache', testInfo.project.name));
    const response = await page.request.get('/api/v1/auth/me');
    expect(response.headers()['cache-control']).toBe('no-store');
  });
});
