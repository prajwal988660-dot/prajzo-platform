import { describe, expect, it } from 'vitest';
import { folderTimestamp, readArguments } from './db-script';

describe('readArguments', () => {
  it('reads values, known flags and the rest, in any order', () => {
    const { values, flags, positional } = readArguments(
      ['--replace', 'backups/x', '--into', 'prajzo-restored'],
      ['replace'],
    );
    expect(flags.has('replace')).toBe(true);
    expect(values.get('into')).toBe('prajzo-restored');
    expect(positional).toEqual(['backups/x']);
  });

  it('refuses a setting with no value', () => {
    expect(() => readArguments(['backups/x', '--into'])).toThrow('--into needs a value');
  });
});

describe('folderTimestamp', () => {
  it('uses India time', () => {
    expect(folderTimestamp(new Date('2026-10-27T17:26:42Z'))).toBe('2026-10-27-225642');
    expect(folderTimestamp(new Date('2026-12-31T20:00:00Z'))).toBe('2027-01-01-013000');
  });
});
