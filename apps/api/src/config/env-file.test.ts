import { parseEnv as parseEnvText } from 'node:util';
import { describe, expect, it } from 'vitest';
import { quoteEnvValue, setEnvValues } from './env-file';

describe('setEnvValues', () => {
  it('replaces settings in place and keeps everything else', () => {
    const before = [
      '# Database',
      'MONGODB_URI=mongodb://example/prajzo',
      '',
      '# SMTP_PASSWORD=not-this-one-it-is-a-comment',
      'SMTP_PASSWORD=old',
      'LOG_LEVEL=info',
      '',
    ].join('\n');
    const after = setEnvValues(before, { SMTP_PASSWORD: 'new', MAIL_TRANSPORT: 'smtp' });
    expect(after).toBe(
      [
        '# Database',
        'MONGODB_URI=mongodb://example/prajzo',
        '',
        '# SMTP_PASSWORD=not-this-one-it-is-a-comment',
        "SMTP_PASSWORD='new'",
        'LOG_LEVEL=info',
        "MAIL_TRANSPORT='smtp'",
        '',
      ].join('\n'),
    );
  });

  it('keeps Windows line endings when the file has them', () => {
    expect(setEnvValues('A=1\r\nB=2\r\n', { B: '3' })).toBe("A=1\r\nB='3'\r\n");
  });

  it('starts an empty file', () => {
    expect(setEnvValues('', { A: 'x' })).toBe("A='x'\n");
  });

  it('saves awkward passwords so they are read back exactly', () => {
    const passwords = ['p#ss w0rd!', "it's$HOME", 'a"b`c', '=leading=equals=', '  spaces  '];
    for (const password of passwords) {
      const text = setEnvValues('', { SMTP_PASSWORD: password });
      // util.parseEnv is the same reader process.loadEnvFile (used by the API) uses.
      expect(parseEnvText(text).SMTP_PASSWORD).toBe(password);
    }
  });

  it('refuses values it could not save faithfully', () => {
    expect(() => quoteEnvValue('two\nlines')).toThrow(/line break/);
    expect(() => quoteEnvValue(`both ' and " and \\`)).toThrow(/cannot be saved/);
  });
});
