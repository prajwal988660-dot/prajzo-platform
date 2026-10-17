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
      /MONGODB_URI must start with mongodb/,
    );
  });

  it('rejects an invalid port', () => {
    expect(problemsFor({ ...valid, PORT: '99999' }).join('\n')).toMatch(/PORT/);
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
});
