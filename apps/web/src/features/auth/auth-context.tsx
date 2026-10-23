import {
  sessionResponseSchema,
  type LoginRequest,
  type PublicUser,
  type RegisterRequest,
} from '@prajzo/shared';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { z } from 'zod';
import { ApiError, apiRequest } from '../../lib/api';

/**
 * `loading`: asking the server who is signed in. `ready`: known (`user` may be null).
 * `unavailable`: the server could not say (for example while the database is down).
 */
export type AuthStatus = 'loading' | 'ready' | 'unavailable';

type AuthState = { status: AuthStatus; user: PublicUser | null };

export interface AuthContextValue extends AuthState {
  signIn: (values: LoginRequest) => Promise<PublicUser>;
  signInAsAdmin: (values: LoginRequest) => Promise<PublicUser>;
  register: (values: RegisterRequest) => Promise<PublicUser>;
  /**
   * Throws if the server could not end the session, so the person is never told they are signed
   * out when they are not.
   */
  signOut: () => Promise<void>;
  /** Replaces the signed-in person's details (after the profile is edited). */
  setUser: (user: PublicUser) => void;
  /** Asks the server again who is signed in. */
  retry: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const request = new AbortController();
    apiRequest('/v1/auth/me', sessionResponseSchema, { signal: request.signal })
      .then(({ user }) => setState({ status: 'ready', user }))
      .catch(() => {
        if (!request.signal.aborted) setState({ status: 'unavailable', user: null });
      });
    return () => request.abort();
  }, [attempt]);

  const submit = useCallback(async (path: string, body: unknown): Promise<PublicUser> => {
    const { user } = await apiRequest(path, sessionResponseSchema, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (!user)
      throw new ApiError(500, 'UNEXPECTED_RESPONSE', 'Something went wrong. Please try again.');
    setState({ status: 'ready', user });
    return user;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      signIn: (values) => submit('/v1/auth/login', values),
      signInAsAdmin: (values) => submit('/v1/auth/admin/login', values),
      register: (values) => submit('/v1/auth/register', values),
      async signOut() {
        await apiRequest('/v1/auth/logout', z.undefined(), { method: 'POST' });
        setState({ status: 'ready', user: null });
      },
      setUser: (user) => setState({ status: 'ready', user }),
      retry: () => {
        setState({ status: 'loading', user: null });
        setAttempt((count) => count + 1);
      },
    }),
    [state, submit],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
