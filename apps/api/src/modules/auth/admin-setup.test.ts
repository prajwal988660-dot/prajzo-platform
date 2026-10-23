import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { startTestDatabase } from '../../test/helpers';
import { adminSetup, type Prompts } from './admin-setup';
import { authenticate, createAdminUser } from './auth.service';
import { UserModel } from './user.model';

let database: { stop: () => Promise<void> };

beforeAll(async () => {
  database = await startTestDatabase();
});
afterAll(async () => {
  await database.stop();
});
beforeEach(async () => {
  await UserModel.deleteMany({});
});

/** A person at the keyboard who gives these answers in order, and sees what is said. */
function scripted(answers: string[]) {
  const said: string[] = [];
  const queue = [...answers];
  const next = () => {
    const answer = queue.shift();
    if (answer === undefined) throw new Error('The setup asked more questions than expected');
    return Promise.resolve(answer);
  };
  const prompts: Prompts = { ask: next, askHidden: next, say: (line) => said.push(line) };
  return { prompts, said, remaining: () => queue.length };
}

const goodPassword = 'a-very-long-admin-pass-1';

describe('adminSetup', () => {
  it('creates an administrator who can then sign in', async () => {
    const person = scripted(['Boss@Example.com', 'Prajzo Admin', goodPassword, goodPassword]);

    expect(await adminSetup(person.prompts)).toBe('created');

    expect(person.said.join('\n')).toMatch(/boss@example.com has been created/);
    const admin = await authenticate('boss@example.com', goodPassword, 'admin');
    expect(admin).toMatchObject({ name: 'Prajzo Admin', role: 'admin' });
  });

  it('asks again when the password is too weak or the two entries differ', async () => {
    const person = scripted([
      'boss@example.com',
      'Prajzo Admin',
      'short', // too weak: asked again
      goodPassword,
      'a-different-typing-9', // does not match: asked again
      goodPassword,
      goodPassword,
    ]);

    expect(await adminSetup(person.prompts)).toBe('created');
    expect(person.said.join('\n')).toMatch(/at least 10 characters/);
    expect(person.said.join('\n')).toMatch(/two passwords are different/);
    expect(person.remaining()).toBe(0);
  });

  it('also holds administrators to the 12-character minimum', async () => {
    const person = scripted([
      'boss@example.com',
      'Prajzo Admin',
      'only-11-chr',
      goodPassword,
      goodPassword,
    ]);

    expect(await adminSetup(person.prompts)).toBe('created');
    expect(person.said.join('\n')).toMatch(/at least 12 characters/);
  });

  it('asks again for an email that is not an email address', async () => {
    const person = scripted([
      'nope',
      'boss@example.com',
      'Prajzo Admin',
      goodPassword,
      goodPassword,
    ]);
    expect(await adminSetup(person.prompts)).toBe('created');
    expect(person.said.join('\n')).toMatch(/email address like name@example.com/);
  });

  it('gives up after three failed tries and changes nothing', async () => {
    const person = scripted([
      'boss@example.com',
      'Prajzo Admin',
      'a',
      'b',
      'c',
      'x',
      'y',
      'z',
      'w',
      'v',
    ]);
    await expect(adminSetup(person.prompts)).rejects.toThrow(/Too many tries/);
    expect(await UserModel.countDocuments()).toBe(0);
  });

  it('sets a new password for an existing administrator, only after being told yes', async () => {
    await createAdminUser({ name: 'Boss', email: 'boss@example.com', password: goodPassword });
    const newPassword = 'a-brand-new-admin-pass-2';

    const declined = scripted(['boss@example.com', 'n']);
    expect(await adminSetup(declined.prompts)).toBe('cancelled');
    expect(await authenticate('boss@example.com', goodPassword, 'admin')).not.toBeNull();

    const accepted = scripted(['boss@example.com', 'y', newPassword, newPassword]);
    expect(await adminSetup(accepted.prompts)).toBe('password-changed');
    expect(await authenticate('boss@example.com', goodPassword, 'admin')).toBeNull();
    expect(await authenticate('boss@example.com', newPassword, 'admin')).not.toBeNull();
  });

  it('refuses to turn a customer account into an administrator', async () => {
    await UserModel.create({
      email: 'asha@example.com',
      name: 'Asha',
      passwordHash: 'x',
      role: 'customer',
    });

    const person = scripted(['asha@example.com']);
    expect(await adminSetup(person.prompts)).toBe('cancelled');
    expect(person.said.join('\n')).toMatch(/belongs to a customer account/);
    expect((await UserModel.findOne({ email: 'asha@example.com' }))?.role).toBe('customer');
  });
});
