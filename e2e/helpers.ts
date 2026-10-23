import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const adminEmail = process.env.E2E_ADMIN_EMAIL ?? '';
export const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? '';

export const strongPassword = 'a-long-passphrase-9';
export const newPassword = 'another-long-passphrase-4';

/** A valid project request, for tests that need a project to exist. */
export const projectDraft = {
  title: 'Website for my studio',
  categoryKey: 'business-websites',
  description: 'A simple five-page website for my photography studio, with a gallery.',
};

/** An email address nobody else in this run uses (tests run in parallel, on desktop and phone). */
export function uniqueEmail(label: string, projectName: string): string {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `e2e-${label}-${projectName}-${suffix}@example.com`;
}

/** Creates an account through the API and signs this browser in with it (no clicking). */
export async function signUpQuietly(
  page: Page,
  email: string,
  options: { name?: string; password?: string } = {},
) {
  const response = await page.request.post('/api/v1/auth/register', {
    data: {
      name: options.name ?? 'E2E Visitor',
      email,
      password: options.password ?? strongPassword,
      acceptTerms: true,
    },
  });
  expect(response.status(), await response.text()).toBe(201);
}

/** Signs this browser in as the test administrator (no clicking). */
export async function signInAsAdminQuietly(page: Page) {
  const response = await page.request.post('/api/v1/auth/admin/login', {
    data: { email: adminEmail, password: adminPassword },
  });
  expect(response.status(), await response.text()).toBe(200);
}

/** On a phone the account links live inside the menu; open it first. */
export async function openMenuIfMobile(page: Page, isMobile: boolean) {
  if (isMobile) await page.getByRole('button', { name: 'Open menu' }).click();
}

/** The header's "Sign out", on desktop or (inside the menu) on a phone. Waits until it is done. */
export async function signOutFromHeader(page: Page, isMobile: boolean) {
  await openMenuIfMobile(page, isMobile);
  const signedOut = page.waitForResponse((response) =>
    response.url().endsWith('/api/v1/auth/logout'),
  );
  await page.getByRole('banner').getByRole('button', { name: 'Sign out' }).click();
  await signedOut;
}

/** The most recent email sent to an address, read from the test server. */
export async function lastEmailTo(request: APIRequestContext, email: string) {
  await expect
    .poll(
      async () =>
        ((await (await request.get(`/api/__e2e/emails?to=${email}`)).json()) as unknown[]).length,
    )
    .toBeGreaterThan(0);
  const emails = (await (await request.get(`/api/__e2e/emails?to=${email}`)).json()) as {
    subject: string;
    text: string;
  }[];
  const last = emails.at(-1);
  if (!last) throw new Error(`No email was sent to ${email}`);
  return last;
}

/** Sends a project request through the API as the signed-in customer; returns its reference number. */
export async function sendProjectQuietly(
  page: Page,
  overrides: Record<string, unknown> = {},
): Promise<string> {
  const response = await page.request.post('/api/v1/project-requests', {
    data: { ...projectDraft, ...overrides },
  });
  expect(response.status(), await response.text()).toBe(201);
  const body = (await response.json()) as { project: { reference: string } };
  return body.project.reference;
}
