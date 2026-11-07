import { useCallback, useEffect, useState } from 'react';
import type { z } from 'zod';
import { ApiError, apiRequest } from './api';

export type ApiState<T> =
  | { status: 'loading'; data?: undefined; error?: undefined }
  | { status: 'success'; data: T; error?: undefined }
  | { status: 'error'; data?: undefined; error: ApiError };

/**
 * Loads `path` from the API when the component appears, with loading, success and error states
 * and a `retry` function. `schema` must be defined outside the component (it is a dependency).
 *
 * `previous` is what was loaded last time, kept while a `retry` is in flight. `status` still goes
 * back to `loading`, so a page that only looks at `status` behaves exactly as before; a page that
 * has something on the screen worth keeping (a message explaining why an action was refused, say)
 * can show `data ?? previous` instead of replacing it all with a spinner.
 */
export function useApi<T>(
  path: string,
  schema: z.ZodType<T>,
): ApiState<T> & { previous?: T; retry: () => void } {
  const [state, setState] = useState<ApiState<T>>({ status: 'loading' });
  // What was loaded before a retry, remembered with the address it came from: a different address
  // is a different thing, so nothing from the last one is offered for it.
  const [kept, setKept] = useState<{ path: string; data: T } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const request = new AbortController();
    apiRequest(path, schema, { signal: request.signal })
      .then((data) => setState({ status: 'success', data }))
      .catch((error: unknown) => {
        if (request.signal.aborted) return;
        setState({
          status: 'error',
          error:
            error instanceof ApiError
              ? error
              : new ApiError(0, 'UNEXPECTED_ERROR', 'Something went wrong. Please try again.'),
        });
      });
    return () => request.abort();
  }, [path, schema, attempt]);

  const loadedData = state.status === 'success' ? state.data : undefined;
  const retry = useCallback(() => {
    // Keep what is on the screen, so a reload after a refused action does not blank the page.
    if (loadedData !== undefined) setKept({ path, data: loadedData });
    setState({ status: 'loading' });
    setAttempt((count) => count + 1);
  }, [loadedData, path]);

  const previous = kept?.path === path ? kept.data : undefined;
  return { ...state, previous, retry };
}
