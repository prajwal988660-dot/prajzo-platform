import type { RequestHandler } from 'express';
import helmet from 'helmet';
import type { Env } from '../config/env';

/**
 * Browser features the site never uses, switched off for it and for anything it embeds: even a
 * script that got in could not ask for the camera, the microphone or the visitor's location. Full
 * screen is kept for the site's own pages (the builder preview, later).
 */
export const permissionsPolicy = [
  'accelerometer=()',
  'autoplay=()',
  'bluetooth=()',
  'camera=()',
  'display-capture=()',
  'encrypted-media=()',
  'fullscreen=(self)',
  'geolocation=()',
  'gyroscope=()',
  'hid=()',
  'magnetometer=()',
  'microphone=()',
  'midi=()',
  'payment=()',
  'publickey-credentials-get=()',
  'screen-wake-lock=()',
  'serial=()',
  'usb=()',
  'xr-spatial-tracking=()',
].join(', ');

/**
 * Security headers for every response. In production the API also serves the web app, so the
 * content security policy below is what protects the pages: only our own scripts, styles,
 * fonts and API, and framing only by our own site (the builder preview).
 */
export function securityHeaders(env: Pick<Env, 'NODE_ENV'>): RequestHandler[] {
  const production = env.NODE_ENV === 'production';
  const standard = helmet({
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
  return [
    standard,
    (_req, res, next) => {
      res.set('Permissions-Policy', permissionsPolicy);
      next();
    },
  ];
}
