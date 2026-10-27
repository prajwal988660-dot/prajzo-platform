import { clientErrorReportSchema } from '@prajzo/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  errorReportingEnabled,
  installErrorReporting,
  reportError,
  resetErrorReporting,
} from './error-reporting';

const fetchMock = vi.fn<typeof fetch>();

/** The reports sent so far, checked against the same rules the server uses. */
function sentReports() {
  return fetchMock.mock.calls.map(([url, init]) => {
    expect(url).toBe('/api/v1/client-errors');
    expect(init?.method).toBe('POST');
    expect(init?.keepalive).toBe(true);
    expect(typeof init?.body).toBe('string');
    return clientErrorReportSchema.parse(JSON.parse(init?.body as string));
  });
}

beforeEach(() => {
  resetErrorReporting();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal('fetch', fetchMock);
  window.history.replaceState(null, '', '/reset-password?token=secret-token#top');
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/');
});

describe('errorReportingEnabled', () => {
  it('is on in production builds only', () => {
    expect(errorReportingEnabled({ PROD: true })).toBe(true);
    expect(errorReportingEnabled({ PROD: false })).toBe(false);
  });
});

describe('reportError', () => {
  it('sends the error and the page path, never the query string or # part', () => {
    const error = new TypeError('x is undefined');
    reportError('render', error);

    const [report] = sentReports();
    expect(report).toMatchObject({
      kind: 'render',
      message: 'TypeError: x is undefined',
      page: '/reset-password',
    });
    expect(report?.stack).toContain('x is undefined');
    expect(JSON.stringify(report)).not.toContain('secret-token');
  });

  it('cuts long messages and stacks to what the server accepts', () => {
    const error = new Error('m'.repeat(5000));
    error.stack = 's'.repeat(10_000);
    reportError('error', error);
    const [report] = sentReports();
    expect(report?.message.length).toBe(1000);
    expect(report?.stack?.length).toBe(4000);
  });

  it('describes values that are not errors', () => {
    reportError('unhandledrejection', { code: 42 });
    reportError('unhandledrejection', 'plain text');
    expect(sentReports().map((report) => report.message)).toEqual(['{"code":42}', 'plain text']);
  });

  it('sends each distinct error once, and at most five per page load', () => {
    for (let round = 0; round < 3; round += 1) {
      for (let index = 0; index < 8; index += 1) reportError('error', new Error(`e${index}`));
    }
    expect(sentReports().map((report) => report.message)).toEqual(
      ['e0', 'e1', 'e2', 'e3', 'e4'].map((name) => `Error: ${name}`),
    );
  });

  it('never throws when sending fails', () => {
    fetchMock.mockRejectedValue(new TypeError('offline'));
    expect(() => reportError('error', new Error('a'))).not.toThrow();
    fetchMock.mockImplementation(() => {
      throw new Error('fetch itself broke');
    });
    expect(() => reportError('error', new Error('b'))).not.toThrow();
  });
});

describe('installErrorReporting', () => {
  let stop: () => void;

  afterEach(() => {
    stop();
  });

  it('reports uncaught errors with where they happened', () => {
    stop = installErrorReporting(window);
    window.dispatchEvent(
      new ErrorEvent('error', {
        error: new RangeError('too deep'),
        message: 'too deep',
        filename: 'http://localhost/assets/index-abc.js',
        lineno: 3,
        colno: 17,
      }),
    );
    expect(sentReports()).toEqual([
      expect.objectContaining({
        kind: 'error',
        message: 'RangeError: too deep',
        source: 'http://localhost/assets/index-abc.js',
        line: 3,
        column: 17,
      }),
    ]);
  });

  it('reports promise rejections nobody handled', () => {
    stop = installErrorReporting(window);
    const event = new Event('unhandledrejection') as PromiseRejectionEvent;
    Object.defineProperty(event, 'reason', { value: new Error('request failed') });
    window.dispatchEvent(event);
    expect(sentReports()).toEqual([
      expect.objectContaining({ kind: 'unhandledrejection', message: 'Error: request failed' }),
    ]);
  });

  it('skips errors from other websites, which carry no details', () => {
    stop = installErrorReporting(window);
    window.dispatchEvent(new ErrorEvent('error', { message: 'Script error.' }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('stops listening when asked', () => {
    stop = installErrorReporting(window);
    stop();
    // No `error` object: with no listener left, Vitest would treat one as a real crash.
    window.dispatchEvent(new ErrorEvent('error', { message: 'late' }));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
