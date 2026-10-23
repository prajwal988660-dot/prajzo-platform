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
    // Where contact-form notifications go. Defaults to the public contact email.
    ADMIN_NOTIFY_EMAIL: z.email('must be an email address').optional(),
    // Contact-form messages allowed per connection every 15 minutes (spam protection).
    CONTACT_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(1000).default(5),
    // Sign-in, sign-up and password-reset attempts allowed per connection every 15 minutes.
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(1000).default(10),
    // How long a customer stays signed in without visiting, and the (shorter) idle limit for admins.
    SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(14),
    ADMIN_SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(72).default(8),
  })
  .superRefine((env, ctx) => {
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
