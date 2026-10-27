import { z } from 'zod';

/**
 * In a browser, tells Zod not to write its own code at runtime.
 *
 * By default Zod tries to build faster checkers with `new Function`, which the website's content
 * security policy forbids on purpose (scripts may come only from our own files). It would fall
 * back quietly, but the browser still reports every attempt as a policy violation. Turning the
 * speed-up off is invisible to visitors: the forms and answers it checks are tiny. The server
 * has no such policy and keeps the speed-up.
 *
 * Zod reads this setting when a schema is created, so it has to run before any schema exists.
 * That is why `index.ts` imports this file first: ES modules run in import order, wherever the
 * bundler puts them. Keep that import first, and keep this file out of any `sideEffects: false`
 * list, or the setting silently disappears (the production check of the real build would notice).
 */
// (`'document' in globalThis` is true only in a browser, and needs no browser types here.)
if ('document' in globalThis) z.config({ jitless: true });
