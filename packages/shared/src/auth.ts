import { z } from 'zod';

export const passwordMinLength = 10;
export const passwordMaxLength = 128;

/**
 * Very common passwords that are long enough to pass the length rule. Checked in lower case.
 * (A short list on purpose: the aim is to stop the obvious choices, not to judge every password.)
 */
const commonPasswords = new Set([
  '1234567890',
  '12345678910',
  '0123456789',
  '1q2w3e4r5t',
  'qwertyuiop',
  'qwerty12345',
  'qwerty123456',
  'password123',
  'password1234',
  'password12345',
  'passw0rd123',
  'iloveyou123',
  'welcome1234',
  'admin12345',
  'administrator',
  'letmein1234',
  'abcdefghij',
  'abcd123456',
  'prajzo12345',
  'prajzo123456',
]);

/** Rules for choosing a password (not applied when signing in, so older passwords still work). */
export const passwordSchema = z
  .string()
  .min(passwordMinLength, `Use at least ${passwordMinLength} characters`)
  .max(passwordMaxLength, `Use at most ${passwordMaxLength} characters`)
  .refine((value) => new Set(value).size >= 5, 'Use a mix of different characters')
  .refine(
    (value) => !commonPasswords.has(value.toLowerCase()),
    'That password is too common. Choose a less predictable one',
  );

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Enter your email address')
  .max(200, 'Keep the email address under 200 characters')
  .pipe(z.email('Enter an email address like name@example.com'));

const nameSchema = z
  .string()
  .trim()
  .min(2, 'Enter your name')
  .max(100, 'Keep your name under 100 characters');

const optionalPhoneSchema = z
  .string()
  .trim()
  .max(30, 'Keep the phone number under 30 characters')
  .optional()
  .transform((value) => (value === '' ? undefined : value))
  .refine(
    (value) => value === undefined || /^\+?[0-9 ()-]{7,20}$/.test(value),
    'Enter a phone number using digits, spaces or +',
  );

/** Create a customer account. */
export const registerRequestSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: optionalPhoneSchema,
  password: passwordSchema,
  acceptTerms: z.boolean().refine((value) => value, 'Tick this box to create your account'),
});
export type RegisterFormValues = z.input<typeof registerRequestSchema>;
export type RegisterRequest = z.output<typeof registerRequestSchema>;

/** An administrator account, created only by the `admin:create` script. Stricter password. */
export const adminAccountRequestSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema.pipe(
    z.string().min(12, 'Administrator passwords need at least 12 characters'),
  ),
});
export type AdminAccountRequest = z.output<typeof adminAccountRequestSchema>;

/** Sign in (customers, and administrators through their own page). */
export const loginRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password').max(1000),
});
export type LoginFormValues = z.input<typeof loginRequestSchema>;
export type LoginRequest = z.output<typeof loginRequestSchema>;

export const forgotPasswordRequestSchema = z.object({ email: emailSchema });
export type ForgotPasswordFormValues = z.input<typeof forgotPasswordRequestSchema>;

export const resetPasswordRequestSchema = z.object({
  token: z.string().min(20, 'This reset link is incomplete').max(200),
  password: passwordSchema,
});
export type ResetPasswordFormValues = z.input<typeof resetPasswordRequestSchema>;

export const updateProfileRequestSchema = z.object({
  name: nameSchema,
  phone: optionalPhoneSchema,
});
export type UpdateProfileFormValues = z.input<typeof updateProfileRequestSchema>;

export const changePasswordRequestSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password').max(1000),
    newPassword: passwordSchema,
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    path: ['newPassword'],
    message: 'Choose a password different from the current one',
  });
export type ChangePasswordFormValues = z.input<typeof changePasswordRequestSchema>;

export const userRoles = ['customer', 'admin'] as const;
export type UserRole = (typeof userRoles)[number];

/** What the API tells the browser about the signed-in person. Never includes the password. */
export const publicUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  phone: z.string().nullable(),
  role: z.enum(userRoles),
});
export type PublicUser = z.infer<typeof publicUserSchema>;

/** GET /auth/me, and the answer to signing in: `user` is null when nobody is signed in. */
export const sessionResponseSchema = z.object({ user: publicUserSchema.nullable() });
export type SessionResponse = z.infer<typeof sessionResponseSchema>;

export const okResponseSchema = z.object({ ok: z.literal(true), message: z.string() });
export type OkResponse = z.infer<typeof okResponseSchema>;

/** GET /admin/overview: real counts from the database. */
export const adminOverviewSchema = z.object({
  customers: z.number().int().nonnegative(),
  contactMessages: z.object({
    total: z.number().int().nonnegative(),
    unread: z.number().int().nonnegative(),
  }),
});
export type AdminOverview = z.infer<typeof adminOverviewSchema>;
