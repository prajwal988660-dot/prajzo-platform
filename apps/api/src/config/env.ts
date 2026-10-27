import { existsSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

const logLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

/** Message for a setting that is missing, or present with the wrong type. */
const required = (hint: string) => ({
  error: (issue: { input?: unknown }) =>
    issue.input === undefined ? `is required (${hint})` : 'has an invalid value',
});

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
    APP_ORIGIN: z.url({
      protocol: /^https?$/,
      ...required('the web app address, e.g. http://localhost:5173'),
    }),
    MONGODB_URI: z
      .string(required('see docs/SETUP.md, "Development database"'))
      .regex(
        /^mongodb(\+srv)?:\/\/\S+$/,
        'must be the full connection string from MongoDB Atlas (Connect → Drivers): one line, ' +
          'no spaces, starting with mongodb+srv:// (see docs/SETUP.md, step 1)',
      )
      .refine(
        (value) => !/[<>]/.test(value),
        'still contains a placeholder such as <db_username> or <db_password>. Replace it with ' +
          'your real value and remove the < and > too (see docs/SETUP.md, step 1)',
      ),
    SESSION_SECRET: z
      .string(required('see docs/ENVIRONMENT.md'))
      .min(32, 'must be at least 32 characters'),
    LOG_LEVEL: z.enum(logLevels).default('info'),
    TRUST_PROXY: z.stringbool().default(false),
    // Serve the built web app from the API (one address for everything). Always on in
    // production; local hosting (npm run host:local) turns it on in development too.
    SERVE_WEB_APP: z.stringbool().optional(),
    WEB_DIST_DIR: z.string().optional(),
    // Optional: DNS servers for looking up mongodb+srv:// addresses, e.g. "1.1.1.1,8.8.8.8".
    // Works around a known Node.js-on-Windows problem ("querySrv ECONNREFUSED").
    DNS_SERVERS: z
      .string()
      .transform((value) =>
        value
          .split(',')
          .map((part) => part.trim())
          .filter(Boolean),
      )
      .pipe(
        z
          .array(
            z.union([z.ipv4(), z.ipv6()], {
              error: 'must be IP addresses separated by commas, e.g. 1.1.1.1,8.8.8.8',
            }),
          )
          .min(1),
      )
      .optional(),
    // Staging protection (D-037): when STAGING_PASSWORD is set, the whole site asks for this user
    // name and password. Set it on a staging site only; leave it unset on the live site.
    STAGING_USER: z
      .string()
      .regex(
        /^[A-Za-z0-9._-]{1,32}$/,
        'may only contain letters, digits, dots, dashes and underscores (up to 32 characters)',
      )
      .default('preview'),
    STAGING_PASSWORD: z
      .string()
      .min(12, 'must be at least 12 characters')
      .max(200, 'must be at most 200 characters')
      .optional(),
    // Where contact-form notifications go. Defaults to the public contact email.
    ADMIN_NOTIFY_EMAIL: z.email('must be an email address').optional(),
    // Contact-form messages allowed per connection every 15 minutes (spam protection).
    CONTACT_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(1000).default(5),
    // Project requests one customer may send per hour (spam protection).
    PROJECT_REQUEST_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(1000).default(10),
    // Things one customer may do to their projects per hour: accept a quote, answer, cancel…
    PROJECT_ACTION_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(10_000).default(60),
    // Browser error reports allowed per connection every 15 minutes (D-058).
    CLIENT_ERROR_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(1000).default(20),
    // Sign-in, sign-up and password-reset attempts allowed per connection every 15 minutes.
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(1000).default(10),
    // The overall limit: API requests of any kind allowed per connection every minute. It keeps
    // one visitor, script or scanner from using up the database for everyone else.
    API_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(100_000).default(600),
    // Requests one administrator may make to the admin area every 15 minutes (a stolen sign-in
    // can't be used to copy everything out in one go). Counted per account, not per connection.
    ADMIN_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(100_000).default(1200),
    // How long a customer stays signed in without visiting, and the (shorter) idle limit for admins.
    // Email (D-060): "console" prints emails to the log; "smtp" really sends them through your
    // mailbox (Hostinger: smtp.hostinger.com, port 465, the mailbox address and its password).
    MAIL_TRANSPORT: z.enum(['console', 'smtp']).default('console'),
    SMTP_HOST: z.string().trim().min(1).optional(),
    // 465 = encrypted from the start; 587 = upgraded with STARTTLS (required, never plain text).
    SMTP_PORT: z.coerce
      .number()
      .int()
      .refine((port) => port === 465 || port === 587, 'must be 465 or 587')
      .default(465),
    SMTP_USER: z.email('must be the full mailbox address').optional(),
    SMTP_PASSWORD: z.string().min(1).optional(),
    // The sender people see. The address defaults to SMTP_USER (most providers insist on it).
    MAIL_FROM: z.email('must be an email address').optional(),
    MAIL_FROM_NAME: z.string().trim().min(1).max(60).default('Prajzo'),
    SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(14),
    ADMIN_SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(72).default(8),
    // The longest a session can last in total, however often it is used, so a stolen or forgotten
    // sign-in can't live for ever. Never shorter than the idle limits above.
    SESSION_MAX_DAYS: z.coerce.number().int().min(1).max(365).default(60),
    ADMIN_SESSION_MAX_HOURS: z.coerce.number().int().min(1).max(168).default(24),
  })
  .superRefine((env, ctx) => {
    if (env.SESSION_MAX_DAYS < env.SESSION_TTL_DAYS) {
      ctx.addIssue({
        code: 'custom',
        path: ['SESSION_MAX_DAYS'],
        message: 'must not be shorter than SESSION_TTL_DAYS',
      });
    }
    if (env.ADMIN_SESSION_MAX_HOURS < env.ADMIN_SESSION_TTL_HOURS) {
      ctx.addIssue({
        code: 'custom',
        path: ['ADMIN_SESSION_MAX_HOURS'],
        message: 'must not be shorter than ADMIN_SESSION_TTL_HOURS',
      });
    }
    if (env.MAIL_TRANSPORT === 'smtp') {
      for (const name of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD'] as const) {
        if (!env[name]) {
          ctx.addIssue({
            code: 'custom',
            path: [name],
            message: 'is required when MAIL_TRANSPORT=smtp (see docs/ENVIRONMENT.md)',
          });
        }
      }
    }
    if (env.NODE_ENV === 'production' && !env.APP_ORIGIN.startsWith('https://')) {
      ctx.addIssue({
        code: 'custom',
        path: ['APP_ORIGIN'],
        message: 'must use https:// in production',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

/** Thrown when settings are missing or invalid. Lists setting names only, never their values. */
export class ConfigError extends Error {
  readonly problems: string[];

  constructor(problems: string[]) {
    super(`Invalid configuration:\n${problems.map((problem) => `  - ${problem}`).join('\n')}`);
    this.name = 'ConfigError';
    this.problems = problems;
  }
}

export function parseEnv(source: Record<string, string | undefined>): Env {
  // An empty value (`KEY=` in .env) counts as "not set".
  const values = Object.fromEntries(
    Object.entries(source).filter(([, value]) => value !== undefined && value.trim() !== ''),
  );
  const result = envSchema.safeParse(values);
  if (!result.success) {
    throw new ConfigError(
      // The first path segment is the setting's name (e.g. DNS_SERVERS, not DNS_SERVERS.1).
      result.error.issues.map((issue) => `${String(issue.path[0] ?? 'settings')} ${issue.message}`),
    );
  }
  return result.data;
}

/**
 * Reads settings from the environment. Outside production, values from apps/api/.env are
 * loaded first (npm runs workspace scripts from the workspace folder). Production settings
 * come only from the host.
 */
export function loadEnv(): Env {
  if (process.env.NODE_ENV !== 'production') {
    const file = path.resolve(process.cwd(), '.env');
    if (existsSync(file)) process.loadEnvFile(file);
  }
  return parseEnv(process.env);
}
