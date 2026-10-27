import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Page } from '@playwright/test';

const webDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../apps/web/dist');

/** Every file of the web build, as the address it is served from, such as "/assets/index-x.js". */
export function builtFiles(): string[] {
  const walk = (directory: string): string[] =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(directory, entry.name);
      return entry.isDirectory() ? walk(full) : [full];
    });
  return walk(webDist).map((file) => `/${path.relative(webDist, file).split(path.sep).join('/')}`);
}

/** The staging password of this run (only the staging server asks for it). */
export const stagingPassword = process.env.PRODUCTION_CHECK_STAGING_PASSWORD ?? '';

/**
 * Records everything a visitor's browser would complain about while a page is used: console
 * errors and warnings (a blocked script or style shows up here), uncaught errors, requests that
 * failed, and any answer that is not a success. `problems()` lists what has happened so far.
 */
export function watchForProblems(page: Page, allowed: (status: number, url: string) => boolean) {
  const found: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      found.push(`console ${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => found.push(`uncaught error: ${error.message}`));
  page.on('requestfailed', (request) =>
    found.push(`request failed: ${request.url()} (${request.failure()?.errorText ?? 'unknown'})`),
  );
  page.on('response', (response) => {
    if (response.status() >= 400 && !allowed(response.status(), response.url())) {
      found.push(`${response.status()} for ${response.url()}`);
    }
  });
  void page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (event) => {
      console.error(
        `Security policy violation: ${event.violatedDirective} blocked ${event.blockedURI || 'inline code'}`,
      );
    });
  });
  return { problems: () => [...found] };
}
