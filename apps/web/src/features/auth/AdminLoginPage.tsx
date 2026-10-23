import { zodResolver } from '@hookform/resolvers/zod';
import { loginRequestSchema, type LoginFormValues, type LoginRequest } from '@prajzo/shared';
import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate } from 'react-router';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { PasswordField, TextField } from '../../components/ui/Field';
import { submitErrorMessage } from '../../lib/form-errors';
import { usePageTitle } from '../../lib/use-page-title';
import { useAuth } from './auth-context';
import { AuthPageShell } from './AuthPageShell';

export function AdminLoginPage() {
  usePageTitle('Administrator sign in');
  const auth = useAuth();
  const [failure, setFailure] = useState<string | null>(null);

  const form = useForm<LoginFormValues, unknown, LoginRequest>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: { email: '', password: '' },
  });
  const { errors, isSubmitting } = form.formState;

  if (auth.user?.role === 'admin') return <Navigate to="/admin" replace />;

  const signIn = async (values: LoginRequest) => {
    setFailure(null);
    try {
      await auth.signInAsAdmin(values);
    } catch (error) {
      setFailure(submitErrorMessage(error, 'Something went wrong. Please try again.'));
      form.resetField('password');
    }
  };

  return (
    <AuthPageShell
      title="Administrator sign in"
      intro="For the Prajzo team. Customers sign in from the main website."
    >
      <form
        noValidate
        onSubmit={(event) => void form.handleSubmit(signIn)(event)}
        className="grid gap-5"
      >
        {failure && (
          <Alert tone="error" title="We couldn't sign you in">
            {failure}
          </Alert>
        )}
        <TextField
          label="Email"
          type="email"
          autoComplete="username"
          inputMode="email"
          required
          error={errors.email?.message}
          {...form.register('email')}
        />
        <PasswordField
          label="Password"
          autoComplete="current-password"
          required
          error={errors.password?.message}
          {...form.register('password')}
        />
        <Button type="submit" size="lg" loading={isSubmitting}>
          <ShieldCheck aria-hidden="true" className="size-4" />
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthPageShell>
  );
}
