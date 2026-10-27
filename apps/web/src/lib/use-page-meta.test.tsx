import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultDescription, sitePages } from '@prajzo/shared';

const head = document.head;
const description = () =>
  head.querySelector('meta[name="description"]')?.getAttribute('content') ?? null;
const canonical = () => head.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null;
const robots = () =>
  [...head.querySelectorAll('meta[name="robots"]')].map((tag) => tag.getAttribute('content'));

/** A fresh copy of the code, as when a page is first opened (the public address is learned once). */
async function freshHooks() {
  vi.resetModules();
  const [meta, title] = await Promise.all([import('./use-page-meta'), import('./use-page-title')]);
  return { usePageMeta: meta.usePageMeta, usePageTitle: title.usePageTitle };
}

beforeEach(() => {
  head
    .querySelectorAll('meta[name="description"], meta[name="robots"], link[rel="canonical"]')
    .forEach((tag) => tag.remove());
  document.title = '';
});

afterEach(() => {
  head
    .querySelectorAll('meta[name="description"], meta[name="robots"], link[rel="canonical"]')
    .forEach((tag) => tag.remove());
});

describe('usePageMeta', () => {
  it('sets the tab title, the description and the canonical address of a listed page', async () => {
    const { usePageMeta } = await freshHooks();

    renderHook(() => usePageMeta('/services'));

    expect(document.title).toBe('Services · Prajzo');
    expect(description()).toBe(sitePages['/services'].description);
    expect(canonical()).toBe(`${window.location.origin}/services`);
    expect(robots()).toEqual([]);
  });

  it('uses the plain site title for the home page', async () => {
    const { usePageMeta } = await freshHooks();

    renderHook(() => usePageMeta('/'));

    expect(document.title).toBe('Prajzo · Web development studio');
    expect(canonical()).toBe(`${window.location.origin}/`);
  });

  it('keeps the address the server wrote, so a page reached by another name still points to the right one', async () => {
    head.insertAdjacentHTML(
      'beforeend',
      '<link rel="canonical" href="https://prajzo.example/pricing" />',
    );
    const { usePageMeta } = await freshHooks();

    const { rerender } = renderHook(({ path }) => usePageMeta(path), {
      initialProps: { path: '/pricing' as '/pricing' | '/about' },
    });
    expect(canonical()).toBe('https://prajzo.example/pricing');

    rerender({ path: '/about' }); // the visitor moves to another page in the app
    expect(canonical()).toBe('https://prajzo.example/about');
    expect(document.title).toBe('About Us · Prajzo');
    expect(description()).toBe(sitePages['/about'].description);
  });

  it('marks pages that are not for search results, with no canonical address', async () => {
    const { usePageMeta } = await freshHooks();
    head.insertAdjacentHTML(
      'beforeend',
      '<link rel="canonical" href="https://prajzo.example/pricing" />',
    );

    const { unmount } = renderHook(() => usePageMeta('/login'));

    expect(document.title).toBe('Sign in · Prajzo');
    expect(description()).toBe(sitePages['/login'].description);
    expect(canonical()).toBeNull();
    expect(robots()).toEqual(['noindex, nofollow']);

    unmount(); // leaving the page lifts the mark again
    expect(robots()).toEqual([]);
  });

  it('only marks the page while it is on show', async () => {
    const { usePageMeta } = await freshHooks();

    const { rerender } = renderHook(({ path }) => usePageMeta(path), {
      initialProps: { path: '/register' as '/register' | '/contact' },
    });
    expect(robots()).toEqual(['noindex, nofollow']);

    rerender({ path: '/contact' });
    expect(robots()).toEqual([]);
    expect(canonical()).toBe(`${window.location.origin}/contact`);
  });
});

describe('usePageTitle', () => {
  it('names the tab, and gives the site description and no canonical address to a page of its own kind', async () => {
    const { usePageMeta, usePageTitle } = await freshHooks();
    renderHook(() => usePageMeta('/services')); // the visitor was on a listed page first
    expect(canonical()).not.toBeNull();

    renderHook(() => usePageTitle('My account'));

    expect(document.title).toBe('My account · Prajzo');
    expect(description()).toBe(defaultDescription);
    expect(canonical()).toBeNull();
  });

  it('uses the plain site title with no name', async () => {
    const { usePageTitle } = await freshHooks();
    renderHook(() => usePageTitle());
    expect(document.title).toBe('Prajzo · Web development studio');
  });
});
