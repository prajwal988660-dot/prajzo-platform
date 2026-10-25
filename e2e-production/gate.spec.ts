import { expect, test } from '@playwright/test';
import { builtFiles, stagingPassword } from './helpers';

/**
 * The staging password (D-037) on the real production build: people without it get nothing, not
 * one page, file or API answer, and what they do get tells them nothing about the site.
 * Runs against the staging server only.
 *
 * These tests use plain `fetch` with every header written out. Playwright's own request helper
 * quietly applies the project's credentials to anything it creates, which would make a
 * "stranger" a signed-in visitor.
 */

const sentence = 'This preview is private. Sign in with the user name and password you were given.';
const withPassword = (password: string, user = 'preview') =>
  `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`;

/** One request as a host's proxy would pass it on, with exactly the headers given. */
async function ask(
  base: string | undefined,
  address: string,
  options: { method?: string; authorization?: string; from?: string; body?: string } = {},
) {
  if (!base) throw new Error('The project has no baseURL');
  return fetch(new URL(address, base), {
    method: options.method ?? 'GET',
    headers: {
      'X-Forwarded-Proto': 'https',
      ...(options.from ? { 'X-Forwarded-For': options.from } : {}),
      ...(options.authorization ? { Authorization: options.authorization } : {}),
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(options.body ? { body: options.body } : {}),
  });
}

test.describe('the staging password covers everything', () => {
  test('every file of the build, every page and the API need it, and open with it', async ({
    baseURL,
  }) => {
    const files = builtFiles();
    expect(files.length).toBeGreaterThan(30); // the build really was found
    expect(files).toContain('/index.html');
    const paths = [
      ...files,
      '/',
      '/services',
      '/pricing',
      '/login',
      '/account',
      '/admin',
      '/admin/projects',
      '/no-such-page',
      '/api/v1/categories',
      '/api/v1/packages',
      '/api/v1/auth/me',
      '/api/health/ready',
      '/robots.txt',
    ];

    for (const address of paths) {
      const refused = await ask(baseURL, address);
      expect(refused.status, `${address} without the password`).toBe(401);
      expect(refused.headers.get('www-authenticate'), address).toMatch(/^Basic /);
      // The refusal is one plain sentence and nothing of the site: no page, no script.
      expect(await refused.text(), address).toBe(sentence);

      const opened = await ask(baseURL, address, { authorization: withPassword(stagingPassword) });
      // Files that don't exist (such as a robots.txt before there is one) are the site's own 404.
      expect([200, 404], `${address} with the password (${opened.status})`).toContain(
        opened.status,
      );
      await opened.arrayBuffer();
    }

    // With the password a visitor reaches the app, which then gives its own answer.
    const adminOnly = await ask(baseURL, '/api/v1/admin/overview', {
      authorization: withPassword(stagingPassword),
    });
    expect(adminOnly.status).toBe(401);
    expect(((await adminOnly.json()) as { error: { code: string } }).error.code).toBe(
      'UNAUTHENTICATED',
    );
    // Without it, the same address gets the gate's plain sentence instead.
    const gated = await ask(baseURL, '/api/v1/admin/overview');
    expect(gated.status).toBe(401);
    expect(await gated.text()).toBe(sentence);
  });

  test('actions are refused too, not only reading', async ({ baseURL }) => {
    for (const [method, address] of [
      ['POST', '/api/v1/contact'],
      ['POST', '/api/v1/auth/login'],
      ['POST', '/api/v1/auth/register'],
      ['POST', '/api/v1/project-requests'],
      ['POST', '/api/v1/admin/categories'],
      ['PATCH', '/api/v1/admin/packages/professional-website'],
      ['DELETE', '/api/v1/auth/logout'],
    ] as const) {
      const response = await ask(baseURL, address, { method, body: '{}' });
      expect(response.status, `${method} ${address}`).toBe(401);
      expect(await response.text(), `${method} ${address}`).toBe(sentence);
    }
  });

  test('a wrong user name or password gets exactly the same refusal as none', async ({
    baseURL,
  }) => {
    const reference = await ask(baseURL, '/');
    for (const authorization of [
      withPassword('not-the-password'),
      withPassword(stagingPassword, 'someone'),
      withPassword(''),
      'Basic not-base64!',
      'Bearer something',
    ]) {
      const answer = await ask(baseURL, '/', { authorization });
      expect(answer.status, authorization).toBe(401);
      expect(await answer.text(), authorization).toBe(await reference.clone().text());
      expect(answer.headers.get('www-authenticate'), authorization).toBe(
        reference.headers.get('www-authenticate'),
      );
    }
  });

  test('the only thing open without a password is "are you running?"', async ({ baseURL }) => {
    const health = await ask(baseURL, '/api/health');
    expect(health.status).toBe(200);
    expect(Object.keys((await health.json()) as object).sort()).toEqual([
      'status',
      'uptimeSeconds',
    ]);

    // Not its readiness check, which reveals whether the database answers.
    expect((await ask(baseURL, '/api/health/ready')).status).toBe(401);
  });

  test('nothing from the private site can be kept by a shared cache or listed by a search engine', async ({
    baseURL,
  }) => {
    const script = builtFiles().find((file) => file.endsWith('.js')) ?? '/';
    for (const [address, authorization] of [
      ['/', undefined],
      ['/assets/missing.js', undefined],
      ['/', withPassword(stagingPassword)],
      ['/api/v1/categories', withPassword(stagingPassword)],
      [script, withPassword(stagingPassword)],
    ] as const) {
      const response = await ask(baseURL, address, authorization ? { authorization } : {});
      expect(response.headers.get('cache-control'), address).toBe('private, no-store');
      expect(response.headers.get('x-robots-tag'), address).toBe('noindex, nofollow, noarchive');
      await response.arrayBuffer();
    }
  });

  test('guessing the password is limited per visitor, and only wrong guesses count', async ({
    baseURL,
  }) => {
    const guesser = '203.0.113.77';
    const bystander = '203.0.113.88';

    // Twenty wrong guesses are answered; after that even the right password is refused for a while.
    const wrong: number[] = [];
    for (let guess = 0; guess < 25; guess += 1) {
      const answer = await ask(baseURL, '/', {
        from: guesser,
        authorization: withPassword(`wrong-guess-${guess}`),
      });
      wrong.push(answer.status);
      await answer.arrayBuffer();
    }
    expect(wrong.slice(0, 20)).toEqual(Array<number>(20).fill(401));
    expect(wrong.slice(20)).toEqual(Array<number>(5).fill(429));
    const stillBlocked = await ask(baseURL, '/', {
      from: guesser,
      authorization: withPassword(stagingPassword),
    });
    expect(stillBlocked.status).toBe(429);
    expect(Number(stillBlocked.headers.get('retry-after'))).toBeGreaterThan(14 * 60);

    // Another visitor is untouched.
    const other = await ask(baseURL, '/', {
      from: bystander,
      authorization: withPassword(stagingPassword),
    });
    expect(other.status).toBe(200);
  });

  test('errors from the site itself never use up the allowance of someone with the password', async ({
    baseURL,
  }) => {
    // A tester on the staging site follows broken links and sends forms with mistakes. That is
    // the site answering, not anyone guessing, and it must never lock them out.
    const tester = '203.0.113.99';
    const authorization = withPassword(stagingPassword);
    const answers: number[] = [];
    for (let mistake = 0; mistake < 30; mistake += 1) {
      for (const address of ['/assets/missing.js', '/missing.png', '/api/v1/nothing-here']) {
        const response = await ask(baseURL, address, { from: tester, authorization });
        answers.push(response.status);
        await response.arrayBuffer();
      }
    }
    expect(new Set(answers)).toEqual(new Set([404]));
    expect((await ask(baseURL, '/', { from: tester, authorization })).status).toBe(200);
  });

  test('a page full of files all at once is never refused', async ({ baseURL }) => {
    // A browser can ask for dozens of files at the same moment.
    const authorization = withPassword(stagingPassword);
    const answers = await Promise.all(
      builtFiles().map((file) => ask(baseURL, file, { from: '203.0.113.123', authorization })),
    );
    expect(new Set(answers.map((answer) => answer.status))).toEqual(new Set([200]));
    await Promise.all(answers.map((answer) => answer.arrayBuffer()));
  });
});
