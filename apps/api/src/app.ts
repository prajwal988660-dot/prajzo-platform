import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { siteContact } from '@prajzo/shared';
import express, { Router, type Express } from 'express';
import { pinoHttp } from 'pino-http';
import type { Env } from './config/env';
import type { Logger } from './lib/logger';
import { apiNotFound, errorHandler } from './middleware/error-handler';
import { noStore } from './middleware/no-store';
import { originCheck } from './middleware/origin-check';
import { apiRateLimit, proxyCheck } from './middleware/rate-limits';
import { securityHeaders } from './middleware/security-headers';
import { createStagingGate } from './middleware/staging-gate';
import { adminRouter } from './modules/admin/admin.routes';
import { createAuthRouters } from './modules/auth/auth.routes';
import { catalogueRouter } from './modules/catalogue/catalogue.routes';
import { clientErrorsRouter } from './modules/client-errors/client-errors.routes';
import { contactRouter } from './modules/contact/contact.routes';
import { healthRouter } from './modules/health/health.routes';
import { createProjectEffects } from './modules/projects/project-effects';
import { projectRequestRouter } from './modules/projects/project-request.routes';
import type { Mailer } from './services/mailer';
import { serveWebApp } from './web/serve-web-app';

export interface AppDependencies {
  env: Env;
  logger: Logger;
  /** Resolves true when the database answers; used by the readiness check. */
  checkDatabase: () => Promise<boolean>;
  mailer: Mailer;
}

export function createApp({ env, logger, checkDatabase, mailer }: AppDependencies): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY ? 1 : false);

  app.use(securityHeaders(env));
  app.use(proxyCheck(env, logger));
  app.use(
    pinoHttp({
      logger,
      genReqId: (_req, res) => {
        const id = randomUUID();
        res.setHeader('X-Request-Id', id);
        return id;
      },
      autoLogging: { ignore: (req) => req.url?.startsWith('/api/health') ?? false },
    }),
  );
  // Staging only (D-037): ask for a password before serving anything at all.
  if (env.STAGING_PASSWORD) {
    logger.warn('Staging password is ON: every page, file and API request asks for a password');
    app.use(createStagingGate({ user: env.STAGING_USER, password: env.STAGING_PASSWORD }));
  }

  // The overall limit comes before the body is read, so a flood of large requests is refused cheaply.
  app.use('/api', apiRateLimit(env.API_RATE_LIMIT_MAX));
  app.use(express.json({ limit: '100kb' }));

  const v1 = Router();
  // Answers are never kept by default; only the public catalogue says otherwise (and not on staging).
  v1.use(noStore);
  // Requests that change data must come from this website, not from another one.
  v1.use(originCheck(env.APP_ORIGIN));
  const accounts = createAuthRouters({ env, logger, mailer });
  v1.use('/auth', accounts.auth);
  v1.use('/me', accounts.me);
  // The activity log entries and emails that follow a change to a project (D-041, D-049).
  const effects = createProjectEffects({
    mailer,
    notifyEmail: env.ADMIN_NOTIFY_EMAIL ?? siteContact.email,
    appOrigin: env.APP_ORIGIN,
  });
  v1.use(
    '/admin',
    adminRouter({
      sessions: accounts.sessions,
      effects,
      rateLimitMax: env.ADMIN_RATE_LIMIT_MAX,
    }),
  );
  v1.use(
    '/project-requests',
    projectRequestRouter({
      sessions: accounts.sessions,
      effects,
      rateLimitMax: env.PROJECT_REQUEST_RATE_LIMIT_MAX,
      actionRateLimitMax: env.PROJECT_ACTION_RATE_LIMIT_MAX,
    }),
  );
  v1.use(catalogueRouter({ publicCaching: !env.STAGING_PASSWORD }));
  v1.use(
    contactRouter({
      mailer,
      notifyEmail: env.ADMIN_NOTIFY_EMAIL ?? siteContact.email,
      rateLimitMax: env.CONTACT_RATE_LIMIT_MAX,
    }),
  );

  v1.use(clientErrorsRouter({ rateLimitMax: env.CLIENT_ERROR_RATE_LIMIT_MAX }));

  app.use('/api', healthRouter({ checkDatabase }));
  app.use('/api/v1', v1);
  app.use('/api', apiNotFound);

  if (env.SERVE_WEB_APP ?? env.NODE_ENV === 'production') {
    serveWebApp(app, env.WEB_DIST_DIR ?? path.resolve(process.cwd(), '../web/dist'), logger, {
      origin: env.APP_ORIGIN,
    });
  }

  app.use(errorHandler);
  return app;
}
