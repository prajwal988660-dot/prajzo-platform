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
      .regex(/^mongodb(\+srv)?:\/\//, 'must start with mongodb:// or mongodb+srv://'),
    SESSION_SECRET: z
      .string(required('see docs/ENVIRONMENT.md'))
      .min(32, 'must be at least 32 characters'),
    LOG_LEVEL: z.enum(logLevels).default('info'),
    TRUST_PROXY: z.stringbool().default(false),
    WEB_DIST_DIR: z.string().optional(),
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
      result.error.issues.map((issue) => `${issue.path.join('.') || 'settings'} ${issue.message}`),
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
