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
 */
export function useApi<T>(path: string, schema: z.ZodType<T>): ApiState<T> & { retry: () => void } {
  const [state, setState] = useState<ApiState<T>>({ status: 'loading' });
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

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((count) => count + 1);
  }, []);

  return { ...state, retry };
}
