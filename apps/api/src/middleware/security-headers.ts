import helmet from 'helmet';
import type { Env } from '../config/env';

/**
 * Security headers for every response. In production the API also serves the web app, so the
 * content security policy below is what protects the pages: only our own scripts, styles,
 * fonts and API, and framing only by our own site (the builder preview).
 */
export function securityHeaders(env: Pick<Env, 'NODE_ENV'>) {
  const production = env.NODE_ENV === 'production';
  return helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"],
        formAction: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        fontSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        ...(production ? { upgradeInsecureRequests: [] } : {}),
      },
    },
    hsts: production ? { maxAge: 15_552_000, includeSubDomains: true } : false,
  });
}
