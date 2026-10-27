import { CLIENT_ERROR_STACK_MAX, type ClientErrorReport } from '@prajzo/shared';

/**
 * Sends crashes in the visitor's browser to the API, which writes them to the server log (D-058).
 * Without this, a page that breaks for a visitor leaves no trace anywhere Prajzo can see.
 *
 * Only the error and the page's path are sent (never form contents, the query string or the `#`
 * part). Each distinct error is sent once per page load and at most 5 in all, so a loop of errors
 * can't flood the server. Sending never throws: a report that fails is simply dropped.
 */

const MAX_REPORTS_PER_PAGE_LOAD = 5;

let sentKeys = new Set<string>();

/** Only for tests: forget what was sent. */
export function resetErrorReporting(): void {
  sentKeys = new Set();
}

/** On in production builds; in development errors already show in the browser console. */
export function errorReportingEnabled(env: { PROD: boolean }): boolean {
  return env.PROD;
}

function describe(value: unknown): { message: string; stack?: string } {
  if (value instanceof Error) {
    return {
      message: `${value.name}: ${value.message}`,
      ...(value.stack ? { stack: value.stack } : {}),
    };
  }
  try {
    return {
      message: typeof value === 'string' ? value : (JSON.stringify(value) ?? String(value)),
    };
  } catch {
    return { message: String(value) };
  }
}

export function reportError(
  kind: ClientErrorReport['kind'],
  error: unknown,
  where: {
    source?: string | undefined;
    line?: number | undefined;
    column?: number | undefined;
  } = {},
): void {
  const { message, stack } = describe(error);
  const key = `${kind}|${message}|${where.source ?? ''}|${String(where.line ?? '')}`;
  if (sentKeys.has(key) || sentKeys.size >= MAX_REPORTS_PER_PAGE_LOAD) return;
  sentKeys.add(key);

  const report: ClientErrorReport = {
    kind,
    message: message.slice(0, 1000),
    ...(where.source ? { source: where.source.slice(0, 500) } : {}),
    ...(where.line !== undefined ? { line: where.line } : {}),
    ...(where.column !== undefined ? { column: where.column } : {}),
    ...(stack ? { stack: stack.slice(0, CLIENT_ERROR_STACK_MAX) } : {}),
    page: window.location.pathname.slice(0, 500),
  };

  try {
    void fetch('/api/v1/client-errors', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
      // Lets the report finish even if the visitor is leaving the page.
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Nothing to do: reporting must never cause a second error.
  }
}

/** Listens for errors nothing caught. Returns a function that stops listening. */
export function installErrorReporting(target: Window): () => void {
  const onError = (event: ErrorEvent) => {
    // An error from a script on another website gives no details ("Script error."): skip it.
    if (!event.error && event.message === 'Script error.') return;
    reportError('error', event.error ?? event.message, {
      source: event.filename || undefined,
      line: event.lineno || undefined,
      column: event.colno || undefined,
    });
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    reportError('unhandledrejection', event.reason);
  };

  target.addEventListener('error', onError);
  target.addEventListener('unhandledrejection', onRejection);
  return () => {
    target.removeEventListener('error', onError);
    target.removeEventListener('unhandledrejection', onRejection);
  };
}
