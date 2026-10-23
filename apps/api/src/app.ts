import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { siteContact } from '@prajzo/shared';
import express, { Router, type Express } from 'express';
import { pinoHttp } from 'pino-http';
import type { Env } from './config/env';
import type { Logger } from './lib/logger';
import { apiNotFound, errorHandler } from './middleware/error-handler';
import { originCheck } from './middleware/origin-check';
import { securityHeaders } from './middleware/security-headers';
import { createStagingGate } from './middleware/staging-gate';
import { createAuthRouters } from './modules/auth/auth.routes';
import { catalogueRouter } from './modules/catalogue/catalogue.routes';
import { contactRouter } from './modules/contact/contact.routes';
import { healthRouter } from './modules/health/health.routes';
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

  app.use(express.json({ limit: '100kb' }));

  const v1 = Router();
  // Requests that change data must come from this website, not from another one.
  v1.use(originCheck(env.APP_ORIGIN));
  const accounts = createAuthRouters({ env, logger, mailer });
  v1.use('/auth', accounts.auth);
  v1.use('/me', accounts.me);
  v1.use('/admin', accounts.admin);
  v1.use(catalogueRouter());
  v1.use(
    contactRouter({
      mailer,
      notifyEmail: env.ADMIN_NOTIFY_EMAIL ?? siteContact.email,
      rateLimitMax: env.CONTACT_RATE_LIMIT_MAX,
    }),
  );

  app.use('/api', healthRouter({ checkDatabase }));
  app.use('/api/v1', v1);
  app.use('/api', apiNotFound);

  if (env.SERVE_WEB_APP ?? env.NODE_ENV === 'production') {
    serveWebApp(app, env.WEB_DIST_DIR ?? path.resolve(process.cwd(), '../web/dist'), logger);
  }

  app.use(errorHandler);
  return app;
}
