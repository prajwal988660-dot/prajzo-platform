import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  catalogueRoutes,
  jsonResponse,
  mockApi,
  sampleAdmin,
  sampleOverview,
  signedInAs,
} from '../../test/mock-api';
import { renderApp } from '../../test/render-app';

/** jsdom does not scroll; this records which element was asked to come into view. */
const scrolled = vi.fn();

beforeEach(() => {
  Element.prototype.scrollIntoView = function (this: Element, options?: unknown) {
    scrolled(this, options);
  };
  mockApi({
    ...catalogueRoutes(),
    ...signedInAs(sampleAdmin),
    'GET /api/v1/admin/overview': () => jsonResponse(200, sampleOverview()),
  });
});

afterEach(() => {
  scrolled.mockClear();
  // @ts-expect-error: put jsdom back as it was
  delete Element.prototype.scrollIntoView;
});

describe('the admin menu on a small screen', () => {
  it('brings the current section into view, so it is not left half hidden', async () => {
    renderApp('/admin/catalogue');

    const current = await screen.findByRole('link', { name: 'Catalogue', current: 'page' });
    await waitFor(() => expect(scrolled).toHaveBeenCalled());
    expect(scrolled.mock.calls.at(-1)?.[0]).toBe(current);
    expect(scrolled.mock.calls.at(-1)?.[1]).toEqual({ block: 'nearest', inline: 'center' });
  });

  it('does it again after moving to another section', async () => {
    renderApp('/admin');
    await screen.findByRole('link', { name: 'Overview', current: 'page' });
    await waitFor(() => expect(scrolled).toHaveBeenCalled());
    scrolled.mockClear();

    await userEvent.click(screen.getByRole('link', { name: 'Messages' }));

    const current = await screen.findByRole('link', { name: 'Messages', current: 'page' });
    await waitFor(() => expect(scrolled.mock.calls.at(-1)?.[0]).toBe(current));
  });
});
