import type { Express } from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import { sessionCookieName } from '../modules/auth/session';

export const customerInput = {
  name: 'Asha Rao',
  email: 'asha@example.com',
  password: 'a-long-passphrase-9',
  acceptTerms: true,
};

/** A supertest agent: remembers cookies between requests, like a browser tab. */
export function browser(app: Express) {
  return request.agent(app);
}

export async function signUp(
  agent: ReturnType<typeof browser>,
  overrides: Partial<typeof customerInput> & Record<string, unknown> = {},
) {
  const response = await agent
    .post('/api/v1/auth/register')
    .send({ ...customerInput, ...overrides });
  if (response.status !== 201) {
    throw new Error(`Sign-up failed with ${response.status}: ${JSON.stringify(response.body)}`);
  }
  return response;
}

/** The value of the session cookie in a response, or null. */
export function sessionCookieOf(response: { headers: Record<string, unknown> }): string | null {
  const header = response.headers['set-cookie'];
  const cookies = Array.isArray(header) ? (header as string[]) : [];
  const match = cookies.find((cookie) => cookie.startsWith(`${sessionCookieName}=`));
  return match ? (match.split(';')[0]?.slice(sessionCookieName.length + 1) ?? null) : null;
}

export function setCookieHeader(response: { headers: Record<string, unknown> }): string {
  const header = response.headers['set-cookie'];
  const cookies = Array.isArray(header) ? (header as string[]) : [];
  return cookies.find((cookie) => cookie.startsWith(`${sessionCookieName}=`)) ?? '';
}

/** Direct access to the stored sessions, for tests about expiry and sign-out. */
export function sessionsCollection() {
  const db = mongoose.connection.db;
  if (!db) throw new Error('The test database is not connected');
  return db.collection('sessions');
}
