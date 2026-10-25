import { describe, expect, it } from 'vitest';
import { ConfigError, parseEnv } from './env';

const valid = {
  NODE_ENV: 'development',
  APP_ORIGIN: 'http://localhost:5173',
  MONGODB_URI: 'mongodb+srv://user:pass@cluster.example.mongodb.net/prajzo',
  SESSION_SECRET: 'a'.repeat(64),
};

function problemsFor(source: Record<string, string | undefined>): string[] {
  try {
    parseEnv(source);
  } catch (error) {
    if (error instanceof ConfigError) return error.problems;
    throw error;
  }
  throw new Error('Expected parseEnv to throw a ConfigError');
}

describe('parseEnv', () => {
  it('accepts valid settings and fills in defaults', () => {
    const env = parseEnv(valid);
    expect(env.PORT).toBe(4000);
    expect(env.LOG_LEVEL).toBe('info');
    expect(env.TRUST_PROXY).toBe(false);
  });

  it('converts PORT and TRUST_PROXY from text', () => {
    const env = parseEnv({ ...valid, PORT: '4100', TRUST_PROXY: 'true' });
    expect(env.PORT).toBe(4100);
    expect(env.TRUST_PROXY).toBe(true);
  });

  it('reports every missing required setting by name', () => {
    const problems = problemsFor({ NODE_ENV: 'development' });
    expect(problems.join('\n')).toMatch(/APP_ORIGIN is required/);
    expect(problems.join('\n')).toMatch(/MONGODB_URI is required/);
    expect(problems.join('\n')).toMatch(/SESSION_SECRET is required/);
  });

  it('treats an empty value as missing', () => {
    expect(problemsFor({ ...valid, MONGODB_URI: '   ' }).join('\n')).toMatch(
      /MONGODB_URI is required/,
    );
  });

  it('rejects a database address that is not a MongoDB connection string', () => {
    expect(problemsFor({ ...valid, MONGODB_URI: 'postgres://localhost/db' }).join('\n')).toMatch(
      /MONGODB_URI must be the full connection string from MongoDB Atlas/,
    );
    expect(problemsFor({ ...valid, MONGODB_URI: 'my atlas connection here' }).join('\n')).toMatch(
      /MONGODB_URI must be the full connection string/,
    );
  });

  it('spots a connection string that still has a <placeholder> in it', () => {
    const problems = problemsFor({
      ...valid,
      MONGODB_URI: 'mongodb://<db_username>:secret@host.example.mongodb.net:27017/prajzo',
    });
    expect(problems.join('\n')).toMatch(/MONGODB_URI still contains a placeholder/);
    expect(problems.join('\n')).not.toContain('secret');
  });

  it('rejects an invalid port', () => {
    expect(problemsFor({ ...valid, PORT: '99999' }).join('\n')).toMatch(/PORT/);
  });

  it('limits how long a sign-in can last in total, by default 60 days and 24 hours', () => {
    const env = parseEnv(valid);
    expect(env.SESSION_MAX_DAYS).toBe(60);
    expect(env.ADMIN_SESSION_MAX_HOURS).toBe(24);
    expect(
      parseEnv({ ...valid, SESSION_MAX_DAYS: '90', ADMIN_SESSION_MAX_HOURS: '12' }),
    ).toMatchObject({
      SESSION_MAX_DAYS: 90,
      ADMIN_SESSION_MAX_HOURS: 12,
    });
  });

  it('refuses a total limit shorter than the idle limit, naming the setting', () => {
    expect(problemsFor({ ...valid, SESSION_TTL_DAYS: '14', SESSION_MAX_DAYS: '7' })).toEqual([
      'SESSION_MAX_DAYS must not be shorter than SESSION_TTL_DAYS',
    ]);
    expect(
      problemsFor({ ...valid, ADMIN_SESSION_TTL_HOURS: '8', ADMIN_SESSION_MAX_HOURS: '4' }),
    ).toEqual(['ADMIN_SESSION_MAX_HOURS must not be shorter than ADMIN_SESSION_TTL_HOURS']);
  });

  it('requires a long session secret without echoing the value', () => {
    const problems = problemsFor({ ...valid, SESSION_SECRET: 'tiny-secret' });
    expect(problems.join('\n')).toMatch(/SESSION_SECRET must be at least 32 characters/);
    expect(problems.join('\n')).not.toContain('tiny-secret');
  });

  it('requires https for the web address in production', () => {
    expect(problemsFor({ ...valid, NODE_ENV: 'production' }).join('\n')).toMatch(
      /APP_ORIGIN must use https:\/\/ in production/,
    );
    expect(() =>
      parseEnv({ ...valid, NODE_ENV: 'production', APP_ORIGIN: 'https://prajzo.com' }),
    ).not.toThrow();
  });

  it('reads DNS_SERVERS as a list of IP addresses', () => {
    expect(parseEnv({ ...valid, DNS_SERVERS: ' 1.1.1.1, 8.8.8.8 ' }).DNS_SERVERS).toEqual([
      '1.1.1.1',
      '8.8.8.8',
    ]);
    expect(parseEnv(valid).DNS_SERVERS).toBeUndefined();
  });

  it('rejects DNS_SERVERS entries that are not IP addresses, naming the setting', () => {
    expect(problemsFor({ ...valid, DNS_SERVERS: '1.1.1.1,dns.google' }).join('\n')).toMatch(
      /^DNS_SERVERS must be IP addresses separated by commas/m,
    );
  });
});
