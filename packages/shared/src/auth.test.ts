import { describe, expect, it } from 'vitest';
import {
  changePasswordRequestSchema,
  loginRequestSchema,
  passwordSchema,
  registerRequestSchema,
  resetPasswordRequestSchema,
  updateProfileRequestSchema,
} from './auth';

/** One message per field: the first one, which is the one a visitor sees. */
function errorsOf(result: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}) {
  const errors: Record<string, string> = {};
  if (result.success) return errors;
  for (const issue of result.error?.issues ?? []) {
    errors[issue.path.map(String).join('.')] ??= issue.message;
  }
  return errors;
}

const validRegistration = {
  name: 'Asha Rao',
  email: '  Asha@Example.com ',
  password: 'a-long-passphrase-9',
  acceptTerms: true,
};

describe('passwordSchema', () => {
  it('accepts a long passphrase, including spaces, and does not trim it', () => {
    expect(passwordSchema.parse('  two words and more  ')).toBe('  two words and more  ');
  });

  it('rejects short passwords', () => {
    expect(errorsOf(passwordSchema.safeParse('short1!'))['']).toBe('Use at least 10 characters');
  });

  it('rejects very long passwords', () => {
    expect(passwordSchema.safeParse('a1b2c3d4e5'.repeat(13)).success).toBe(false);
  });

  it('rejects passwords made of almost the same character', () => {
    expect(errorsOf(passwordSchema.safeParse('aaaaaaaaaaaa'))['']).toBe(
      'Use a mix of different characters',
    );
  });

  it('rejects very common passwords in any letter case', () => {
    expect(errorsOf(passwordSchema.safeParse('Password123'))['']).toMatch(/too common/);
    expect(errorsOf(passwordSchema.safeParse('QWERTYUIOP'))['']).toMatch(/too common/);
  });
});

describe('registerRequestSchema', () => {
  it('accepts a complete registration and cleans the email', () => {
    const result = registerRequestSchema.parse({ ...validRegistration, phone: '' });
    expect(result.email).toBe('asha@example.com');
    expect(result.phone).toBeUndefined();
  });

  it('explains each problem in plain words', () => {
    expect(
      errorsOf(
        registerRequestSchema.safeParse({
          name: 'A',
          email: 'nope',
          password: 'x',
          acceptTerms: false,
        }),
      ),
    ).toEqual({
      name: 'Enter your name',
      email: 'Enter an email address like name@example.com',
      password: 'Use at least 10 characters',
      acceptTerms: 'Tick this box to create your account',
    });
  });

  it('accepts an Indian phone number and rejects letters', () => {
    expect(
      errorsOf(registerRequestSchema.safeParse({ ...validRegistration, phone: '+91 98866 07720' })),
    ).toEqual({});
    expect(
      errorsOf(registerRequestSchema.safeParse({ ...validRegistration, phone: 'call me' })),
    ).toHaveProperty('phone');
  });
});

describe('loginRequestSchema', () => {
  it('does not apply the new-password rules, so existing passwords still work', () => {
    expect(loginRequestSchema.safeParse({ email: 'a@b.co', password: 'old' }).success).toBe(true);
  });

  it('asks for both fields', () => {
    expect(errorsOf(loginRequestSchema.safeParse({ email: '', password: '' }))).toEqual({
      email: 'Enter your email address',
      password: 'Enter your password',
    });
  });
});

describe('changePasswordRequestSchema', () => {
  it('requires a new password different from the current one', () => {
    const errors = errorsOf(
      changePasswordRequestSchema.safeParse({
        currentPassword: 'the-same-password-1',
        newPassword: 'the-same-password-1',
      }),
    );
    expect(errors.newPassword).toBe('Choose a password different from the current one');
  });
});

describe('resetPasswordRequestSchema and updateProfileRequestSchema', () => {
  it('checks the new password with the same rules', () => {
    expect(
      errorsOf(resetPasswordRequestSchema.safeParse({ token: 'x'.repeat(40), password: 'short' })),
    ).toHaveProperty('password');
  });

  it('requires a name for the profile and allows an empty phone', () => {
    expect(updateProfileRequestSchema.parse({ name: 'Ravi K', phone: '' }).phone).toBeUndefined();
    expect(errorsOf(updateProfileRequestSchema.safeParse({ name: '' }))).toHaveProperty('name');
  });
});
