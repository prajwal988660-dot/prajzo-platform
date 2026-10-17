import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ApiError, apiRequest, getReadiness } from './api';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function mockFetch(implementation: () => Promise<Response>) {
  const fetchMock = vi.fn(implementation);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const itemSchema = z.object({ id: z.string() });

describe('apiRequest', () => {
  it('returns data that matches the schema', async () => {
    const fetchMock = mockFetch(() => Promise.resolve(jsonResponse(200, { id: 'abc' })));

    await expect(apiRequest('/v1/items/abc', itemSchema)).resolves.toEqual({ id: 'abc' });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/items/abc',
      expect.objectContaining({ credentials: 'same-origin' }),
    );
  });

  it('sends JSON bodies with the right header', async () => {
    const fetchMock = mockFetch(() => Promise.resolve(jsonResponse(201, { id: 'new' })));
    await apiRequest('/v1/items', itemSchema, {
      method: 'POST',
      body: JSON.stringify({ name: 'x' }),
    });

    const headers = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1]
      .headers as Headers;
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('turns API error responses into ApiError with the field messages', async () => {
    mockFetch(() =>
      Promise.resolve(
        jsonResponse(400, {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Some details need fixing.',
            fields: { email: 'Enter a valid email' },
          },
        }),
      ),
    );

    const error = await apiRequest('/v1/contact', itemSchema).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      code: 'VALIDATION_FAILED',
      fields: { email: 'Enter a valid email' },
    });
  });

  it('reports a network failure with a friendly message', async () => {
    mockFetch(() => Promise.reject(new TypeError('Failed to fetch')));
    const error = await apiRequest('/v1/items', itemSchema).catch((caught: unknown) => caught);
    expect(error).toMatchObject({ code: 'NETWORK_ERROR' });
    expect((error as ApiError).message).toMatch(/could not reach/);
  });

  it('rejects successful responses with unexpected data', async () => {
    mockFetch(() => Promise.resolve(jsonResponse(200, { unexpected: true })));
    await expect(apiRequest('/v1/items/abc', itemSchema)).rejects.toMatchObject({
      code: 'UNEXPECTED_RESPONSE',
    });
  });

  it('rejects error responses that are not in the API format', async () => {
    mockFetch(() => Promise.resolve(new Response('<html>Bad gateway</html>', { status: 502 })));
    await expect(apiRequest('/v1/items/abc', itemSchema)).rejects.toMatchObject({
      status: 502,
      code: 'UNEXPECTED_RESPONSE',
    });
  });
});

describe('getReadiness', () => {
  it('reads the body of a 503 answer as "database disconnected"', async () => {
    mockFetch(() =>
      Promise.resolve(jsonResponse(503, { status: 'unavailable', database: 'disconnected' })),
    );
    await expect(getReadiness()).resolves.toEqual({
      status: 'unavailable',
      database: 'disconnected',
    });
  });
});
