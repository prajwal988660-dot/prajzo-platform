import { createHash, randomBytes } from 'node:crypto';
import argon2 from 'argon2';

// Empty means the library's strong defaults: argon2id, 64 MiB of memory, 3 passes, 4 lanes.
let cost: { memoryCost?: number; timeCost?: number; parallelism?: number } = {};

/**
 * Makes hashing cheap so tests (which hash hundreds of passwords, often in parallel) stay fast.
 * Only tests call this; the real server never does, so real passwords always get the strong
 * settings. Hashes made either way verify the same, because each hash records its own settings.
 */
export function useCheapPasswordHashingForTests(): void {
  cost = { memoryCost: 1024, timeCost: 2, parallelism: 1 };
}

/** Passwords are stored only as argon2id hashes (memory-hard, so guessing is expensive). */
export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id, ...cost });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false; // a malformed hash never lets anyone in
  }
}

// Verified against when an email isn't registered, so that "unknown email" and "wrong password"
// take about the same time and can't be told apart by timing.
let decoyHash: Promise<string> | undefined;
export async function verifyAgainstDecoy(password: string): Promise<void> {
  decoyHash ??= hashPassword(randomBytes(16).toString('hex'));
  await verifyPassword(await decoyHash, password);
}

/** A random single-use token for password-reset links. */
export function createResetToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashResetToken(token) };
}

export function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
