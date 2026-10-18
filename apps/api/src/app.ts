import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { siteContact } from '@prajzo/shared';
import express, { Router, type Express } from 'express';
import { pinoHttp } from 'pino-http';
import type { Env } from './config/env';
import type { Logger } from './lib/logger';
import { apiNotFound, errorHandler } from './middleware/error-handler';
import { securityHeaders } from './middleware/security-headers';
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
  app.use(express.json({ limit: '100kb' }));

  const v1 = Router();
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

  if (env.NODE_ENV === 'production') {
    serveWebApp(app, env.WEB_DIST_DIR ?? path.resolve(process.cwd(), '../web/dist'), logger);
  }

  app.use(errorHandler);
  return app;
}
