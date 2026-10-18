import { describe, expect, it } from 'vitest';
import { connectionHint, describeError } from './connection';

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

  it('also hides passwords that contain "@"', () => {
    const text = describeError(
      new Error('Invalid URI mongodb+srv://prajzo:p@ss@w0rd@cluster0.abc.mongodb.net/prajzo'),
    );
    expect(text).not.toMatch(/p@ss|w0rd/);
    expect(text).toContain('mongodb+srv://***@cluster0.abc.mongodb.net');
  });

  it('handles values that are not Error objects', () => {
    expect(describeError('plain failure')).toBe('plain failure');
  });
});

describe('connectionHint', () => {
  it('points to DNS_SERVERS when the mongodb+srv address cannot be looked up', () => {
    const error = new Error('querySrv ECONNREFUSED _mongodb._tcp.prajzo-dev.abcde.mongodb.net');
    expect(connectionHint(error)).toContain('DNS_SERVERS=1.1.1.1,8.8.8.8');
  });

  it('points to the database user when Atlas rejects the password', () => {
    const error = new Error('bad auth : authentication failed');
    expect(connectionHint(error)).toMatch(/username or password/);
  });

  it('points to Network Access when Atlas does not answer', () => {
    const error = new Error(
      "Could not connect to any servers in your MongoDB Atlas cluster. One common reason is that you're trying to access the database from an IP that isn't whitelisted.",
    );
    expect(connectionHint(error)).toMatch(/Network Access/);
  });

  it('falls back to a general hint', () => {
    expect(connectionHint(new Error('something unusual'))).toMatch(/Check MONGODB_URI/);
  });
});
