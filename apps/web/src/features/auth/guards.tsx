import { RefreshCw } from 'lucide-react';
import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router';
import { Container } from '../../components/layout/Container';
import { Button, ButtonLink } from '../../components/ui/Button';
import { LoadingBlock } from '../../components/ui/LoadStates';
import { usePageTitle } from '../../lib/use-page-title';
import { useAuth } from './auth-context';
import { safeNextPath } from './safe-next';

/** Wraps the whole app: everything below can ask `useAuth()` who is signed in. */
export { AuthProvider } from './auth-context';

function WaitingForSession() {
  return (
    <Container>
      <LoadingBlock label="Checking your sign-in" />
    </Container>
  );
}

function SessionUnavailable() {
  const { retry } = useAuth();
  usePageTitle('Temporarily unavailable');
  return (
    <Container className="flex flex-col items-center py-24 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">
        We can&apos;t check your sign-in right now
      </h1>
      <p className="mt-4 max-w-md text-slate-600">
        This part of the site is temporarily unavailable. Please try again in a minute.
      </p>
      <Button className="mt-8" onClick={retry}>
        <RefreshCw aria-hidden="true" className="size-4" />
        Try again
      </Button>
    </Container>
  );
}

function Forbidden() {
  usePageTitle('No access');
  return (
    <Container className="flex flex-col items-center py-24 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">
        You don&apos;t have access to this page
      </h1>
      <p className="mt-4 max-w-md text-slate-600">
        This area is only for Prajzo administrators. Your account is a customer account.
      </p>
      <ButtonLink to="/account" className="mt-8">
        Go to your account
      </ButtonLink>
    </Container>
  );
}

/**
 * Pages only for signed-out visitors (sign in, register). Someone who is already signed in is
 * sent on to where they were going, or to their own area.
 *
 * These guards are for convenience: they save people from looking at pages that won't work for
 * them. The real protection is on the server, which checks every private request itself.
 */
export function GuestOnly() {
  const auth = useAuth();
  const [searchParams] = useSearchParams();
  if (auth.status === 'loading') return <WaitingForSession />;
  if (auth.user) {
    const home = auth.user.role === 'admin' ? '/admin' : '/account';
    return <Navigate to={safeNextPath(searchParams.get('next'), home)} replace />;
  }
  return <Outlet />;
}

/** Pages for signed-in customers. */
export function RequireCustomer() {
  const auth = useAuth();
  const location = useLocation();
  if (auth.status === 'loading') return <WaitingForSession />;
  if (auth.status === 'unavailable') return <SessionUnavailable />;
  if (!auth.user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  if (auth.user.role === 'admin') return <Navigate to="/admin" replace />;
  return <Outlet />;
}

/** Pages for administrators. */
export function RequireAdmin() {
  const auth = useAuth();
  if (auth.status === 'loading') return <WaitingForSession />;
  if (auth.status === 'unavailable') return <SessionUnavailable />;
  if (!auth.user) return <Navigate to="/admin/login" replace />;
  if (auth.user.role !== 'admin') return <Forbidden />;
  return <Outlet />;
}
