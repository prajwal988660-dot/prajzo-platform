import { describe, expect, it } from 'vitest';
import { safeNextPath } from './safe-next';

describe('safeNextPath', () => {
  it('keeps paths on this website, with their query and fragment', () => {
    expect(safeNextPath('/account', '/')).toBe('/account');
    expect(safeNextPath('/pricing?plan=pro#top', '/')).toBe('/pricing?plan=pro#top');
  });

  it('falls back when nothing is given', () => {
    expect(safeNextPath(null, '/account')).toBe('/account');
    expect(safeNextPath('', '/account')).toBe('/account');
    expect(safeNextPath(undefined, '/account')).toBe('/account');
  });

  it.each([
    ['another website', 'https://evil.example/steal'],
    ['a protocol-relative address', '//evil.example'],
    ['a backslash trick', '/\\evil.example'],
    ['javascript:', 'javascript:alert(1)'],
    ['a relative path without a leading slash', 'account'],
    ['a line break', '/account\r\nSet-Cookie: x=y'],
    ['a tab in the host part', '/\t/evil.example'],
  ])('rejects %s', (_name, value) => {
    expect(safeNextPath(value, '/account')).toBe('/account');
  });

  it('never loops back to a sign-in page', () => {
    expect(safeNextPath('/login', '/account')).toBe('/account');
    expect(safeNextPath('/login?next=/x', '/account')).toBe('/account');
    expect(safeNextPath('/register', '/account')).toBe('/account');
    expect(safeNextPath('/admin/login', '/admin')).toBe('/admin');
  });
});
