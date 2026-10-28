import { describe, expect, it } from 'vitest';
import {
  defaultDescription,
  defaultTitle,
  fullTitle,
  indexablePaths,
  isPrivateArea,
  kindOfAddress,
  normalizePath,
  pageAt,
  pagePaths,
  privateAreas,
  sitePages,
} from './site-pages';

describe('the table of pages', () => {
  it.each(pagePaths)('%s has a description that fits a search result', (path) => {
    const { description } = sitePages[path];
    // Search engines cut a description at about 155 to 160 characters, and short ones are ignored.
    expect(description.length, description).toBeGreaterThanOrEqual(50);
    expect(description.length, description).toBeLessThanOrEqual(160);
    expect(description).not.toMatch(/[<>"]/); // plain text: it is written into HTML
    expect(description.trim()).toBe(description);
    expect(description).toMatch(/[.!?]$/);
  });

  it('gives every page its own description and its own name', () => {
    const descriptions = pagePaths.map((path) => sitePages[path].description);
    expect(new Set(descriptions).size).toBe(descriptions.length);
    const names = pagePaths.map((path) => ('name' in sitePages[path] ? sitePages[path].name : ''));
    expect(new Set(names).size).toBe(names.length);
  });

  it('has addresses that are written the way the website normalises them', () => {
    for (const path of pagePaths) {
      expect(normalizePath(path), path).toBe(path);
      expect(path).toMatch(/^\/[a-z0-9-/]*$/);
    }
  });

  it('lists the public pages in the sitemap, and not the sign-in pages', () => {
    expect(indexablePaths).toEqual([
      '/',
      '/services',
      '/how-it-works',
      '/pricing',
      '/about',
      '/contact',
      '/start-project',
      '/privacy',
      '/terms',
      '/projects',
      '/templates',
      '/templates/portfolio',
    ]);
    for (const path of ['/login', '/register', '/forgot-password', '/reset-password'] as const) {
      expect(sitePages[path].index, path).toBe(false);
    }
  });

  it('takes the default description and title from the home page', () => {
    expect(defaultDescription).toBe(sitePages['/'].description);
    expect(defaultTitle).toBe('Prajzo · Web development studio');
  });
});

describe('titles', () => {
  it('puts the page name before the site name, and uses the default for the home page', () => {
    expect(fullTitle('Services')).toBe('Services · Prajzo');
    expect(fullTitle()).toBe(defaultTitle);
    expect(fullTitle('')).toBe(defaultTitle);
  });
});

describe('addresses', () => {
  it.each([
    ['', '/'],
    ['/', '/'],
    ['//', '/'],
    ['/services', '/services'],
    ['/services/', '/services'],
    ['/Services', '/services'],
    ['/services?utm_source=newsletter', '/services'],
    ['/services/?a=1#top', '/services'],
    ['/HOW-IT-WORKS//', '/how-it-works'],
  ])('reads %j as %j', (written, normal) => {
    expect(normalizePath(written)).toBe(normal);
  });

  it('knows a page by any way of writing its address', () => {
    expect(pageAt('/Pricing/')?.path).toBe('/pricing');
    expect(pageAt('/')?.path).toBe('/');
    expect(pageAt('/pricing/extra')).toBeUndefined();
    // Names that exist on every object must not be mistaken for pages.
    for (const trick of ['/constructor', '/__proto__', '/toString', '/hasOwnProperty']) {
      expect(pageAt(trick), trick).toBeUndefined();
    }
  });

  it.each([
    ['/account', true],
    ['/account/', true],
    ['/account/projects', true],
    ['/account/projects/PRZ-2026-0001', true],
    ['/admin', true],
    ['/Admin/Projects', true],
    ['/admin/login', true],
    ['/accounts', false],
    ['/administrator', false],
    ['/my-account', false],
    ['/', false],
    ['/services', false],
  ])('says whether %s is in a private area: %s', (address, expected) => {
    expect(isPrivateArea(address)).toBe(expected);
  });

  it('sorts every address into a page, a private area, or nothing', () => {
    expect(kindOfAddress('/')).toBe('page');
    expect(kindOfAddress('/login')).toBe('page');
    expect(kindOfAddress('/admin/projects')).toBe('private');
    expect(kindOfAddress('/account')).toBe('private');
    expect(kindOfAddress('/no-such-page')).toBe('unknown');
    expect(kindOfAddress('/dev/ui')).toBe('unknown');
    expect(privateAreas).toEqual(['/account', '/admin', '/build', '/preview']);
    expect(kindOfAddress('/build/abc123')).toBe('private');
  });
});
