import type { Logger } from './logger';

type FatalErrorTarget = Pick<NodeJS.Process, 'on'> & { exit: (code: number) => void };

/** How long to wait for the log to be written before exiting anyway. */
const FLUSH_TIMEOUT_MS = 2000;

/**
 * An error that nothing caught, or a promise rejection that nothing handled, leaves the process
 * in an unknown state, so it is logged as fatal and the process exits with code 1 (D-058). The
 * host (or `npm run host:local`) starts it again. Without this, the crash would only reach
 * standard error as a bare stack, outside the structured log.
 *
 * The log is flushed before exiting; if that hangs, the process exits after two seconds anyway.
 */
export function installFatalErrorHandlers(
  logger: Pick<Logger, 'fatal' | 'flush'>,
  target: FatalErrorTarget = process,
): void {
  let exiting = false;
  const handle = (kind: 'uncaughtException' | 'unhandledRejection', error: unknown) => {
    if (exiting) return;
    exiting = true;
    logger.fatal({ err: error, kind }, 'The API crashed and is stopping');
    const timer = setTimeout(() => target.exit(1), FLUSH_TIMEOUT_MS);
    timer.unref();
    logger.flush(() => {
      clearTimeout(timer);
      target.exit(1);
    });
  };
  target.on('uncaughtException', (error) => handle('uncaughtException', error));
  target.on('unhandledRejection', (reason) => handle('unhandledRejection', reason));
}
