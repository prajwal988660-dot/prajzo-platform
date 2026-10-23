import { Outlet } from 'react-router';
import { AuthProvider } from '../features/auth/auth-context';

/** The top of the route tree: everything below can ask who is signed in. */
export function AuthRoot() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}
