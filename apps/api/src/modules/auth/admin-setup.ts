import { adminAccountRequestSchema } from '@prajzo/shared';
import { createAdminUser, findUserByEmail, setAdminPassword } from './auth.service';

/** How the setup talks to the person at the keyboard (real terminal, or scripted in tests). */
export interface Prompts {
  ask(question: string): Promise<string>;
  /** Asks without showing what is typed. */
  askHidden(question: string): Promise<string>;
  say(line: string): void;
}

export type AdminSetupResult = 'created' | 'password-changed' | 'cancelled';

const MAX_TRIES = 3;

async function askUntilValid<T>(
  prompts: Prompts,
  question: string,
  check: (answer: string) => { ok: true; value: T } | { ok: false; message: string },
  { hidden = false } = {},
): Promise<T> {
  for (let attempt = 1; attempt <= MAX_TRIES; attempt += 1) {
    const answer = hidden ? await prompts.askHidden(question) : await prompts.ask(question);
    const result = check(answer);
    if (result.ok) return result.value;
    prompts.say(result.message);
  }
  throw new Error('Too many tries. Nothing was changed.');
}

async function askNewPassword(prompts: Prompts): Promise<string> {
  const rules = adminAccountRequestSchema.shape.password;
  for (let attempt = 1; attempt <= MAX_TRIES; attempt += 1) {
    const password = await prompts.askHidden('New password (at least 12 characters): ');
    const checked = rules.safeParse(password);
    if (!checked.success) {
      prompts.say(checked.error.issues[0]?.message ?? 'That password is not allowed.');
      continue;
    }
    const again = await prompts.askHidden('Type the password again: ');
    if (again !== password) {
      prompts.say('The two passwords are different. Try again.');
      continue;
    }
    return password;
  }
  throw new Error('Too many tries. Nothing was changed.');
}

/**
 * Creates an administrator account, or sets a new password for an existing one. This is the
 * only way administrators come to exist: there is no sign-up page for them, and no password
 * is ever written in code or in a file.
 */
export async function adminSetup(prompts: Prompts): Promise<AdminSetupResult> {
  const emailRules = adminAccountRequestSchema.shape.email;
  const email = await askUntilValid(prompts, 'Administrator email address: ', (answer) => {
    const checked = emailRules.safeParse(answer);
    return checked.success
      ? { ok: true, value: checked.data }
      : { ok: false, message: checked.error.issues[0]?.message ?? 'Enter a valid email address.' };
  });

  const existing = await findUserByEmail(email);
  if (existing) {
    if (existing.role !== 'admin') {
      prompts.say(
        'That email address belongs to a customer account. Use a different email address for the administrator.',
      );
      return 'cancelled';
    }
    const answer = await prompts.ask(
      'An administrator with this email already exists. Set a new password for them? (y/N): ',
    );
    if (answer.trim().toLowerCase() !== 'y') {
      prompts.say('Nothing was changed.');
      return 'cancelled';
    }
    await setAdminPassword(email, await askNewPassword(prompts));
    prompts.say(`The password for ${email} has been changed.`);
    return 'password-changed';
  }

  const nameRules = adminAccountRequestSchema.shape.name;
  const name = await askUntilValid(prompts, 'Name: ', (answer) => {
    const checked = nameRules.safeParse(answer);
    return checked.success
      ? { ok: true, value: checked.data }
      : { ok: false, message: checked.error.issues[0]?.message ?? 'Enter a name.' };
  });
  const password = await askNewPassword(prompts);
  await createAdminUser({ name, email, password });
  prompts.say(`Administrator ${email} has been created. Sign in at /admin/login.`);
  return 'created';
}
