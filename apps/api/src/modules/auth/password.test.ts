import { describe, expect, it } from 'vitest';
import {
  createResetToken,
  hashPassword,
  hashResetToken,
  useCheapPasswordHashingForTests,
  verifyPassword,
} from './password';

/** The settings a hash records about itself, read by name rather than by position. */
function settingsOf(hash: string) {
  const read = (pattern: RegExp) => Number(pattern.exec(hash)?.[1]);
  return {
    algorithm: hash.split('$')[1],
    memoryKiB: read(/[,$]m=(\d+)/),
    passes: read(/[,$]t=(\d+)/),
    lanes: read(/[,$]p=(\d+)/),
  };
}

describe('password hashing', () => {
  // Order matters: the first test runs before cheap hashing is switched on in this file.
  it('uses the strong argon2id settings by default (64 MiB, 3 passes, 4 lanes)', async () => {
    const hash = await hashPassword('a-long-passphrase-9');
    expect(settingsOf(hash)).toEqual({
      algorithm: 'argon2id',
      memoryKiB: 65536,
      passes: 3,
      lanes: 4,
    });
    expect(await verifyPassword(hash, 'a-long-passphrase-9')).toBe(true);
    expect(await verifyPassword(hash, 'a-different-passphrase')).toBe(false);
  });

  it('gives the same password a different hash every time (random salt)', async () => {
    const [one, two] = await Promise.all([
      hashPassword('same-password-1'),
      hashPassword('same-password-1'),
    ]);
    expect(one).not.toBe(two);
  });

  it('keeps verifying older strong hashes after cheap hashing is switched on for tests', async () => {
    const strong = await hashPassword('a-long-passphrase-9');
    useCheapPasswordHashingForTests();
    const cheap = await hashPassword('a-long-passphrase-9');

    expect(settingsOf(cheap)).toEqual({
      algorithm: 'argon2id',
      memoryKiB: 1024,
      passes: 2,
      lanes: 1,
    });
    expect(await verifyPassword(strong, 'a-long-passphrase-9')).toBe(true);
    expect(await verifyPassword(cheap, 'a-long-passphrase-9')).toBe(true);
  });

  it('treats a damaged hash as "no match" instead of failing', async () => {
    expect(await verifyPassword('not-a-hash', 'anything')).toBe(false);
    expect(await verifyPassword('', 'anything')).toBe(false);
  });
});

describe('reset tokens', () => {
  it('are long, random and URL-safe, and stored only as a hash', () => {
    const first = createResetToken();
    const second = createResetToken();

    expect(first.token).toMatch(/^[\w-]{43}$/);
    expect(first.token).not.toBe(second.token);
    expect(first.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(first.tokenHash).toBe(hashResetToken(first.token));
    expect(first.tokenHash).not.toContain(first.token);
  });
});
