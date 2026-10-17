import { describe, expect, it } from 'vitest';
import { describeError } from './connection';

describe('describeError', () => {
  it('removes credentials from connection strings before logging', () => {
    const text = describeError(
      new Error(
        'getaddrinfo ENOTFOUND for mongodb+srv://prajzo:S3cret!@cluster0.abc.mongodb.net/prajzo',
      ),
    );
    expect(text).not.toContain('S3cret!');
    expect(text).toContain('mongodb+srv://***@cluster0.abc.mongodb.net');
  });

  it('handles values that are not Error objects', () => {
    expect(describeError('plain failure')).toBe('plain failure');
  });
});
