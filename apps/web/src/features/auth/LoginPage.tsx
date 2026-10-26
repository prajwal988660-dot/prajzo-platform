import { zodResolver } from '@hookform/resolvers/zod';
import { loginRequestSchema, type LoginFormValues, type LoginRequest } from '@prajzo/shared';
import { LogIn } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { PasswordField, TextField } from '../../components/ui/Field';
import { submitErrorMessage } from '../../lib/form-errors';
import { usePageMeta } from '../../lib/use-page-meta';
import { useAuth } from './auth-context';
import { AuthPageShell } from './AuthPageShell';

const linkClass = 'font-medium text-brand-indigo underline underline-offset-2';

export function LoginPage() {
  usePageMeta('/login');
  const auth = useAuth();
  const [searchParams] = useSearchParams();
  const [failure, setFailure] = useState<string | null>(null);

  const form = useForm<LoginFormValues, unknown, LoginRequest>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: { email: '', password: '' },
  });
  const { errors, isSubmitting } = form.formState;

  // After a successful sign-in the page guard sends the person on (to where they were headed).
  const signIn = async (values: LoginRequest) => {
    setFailure(null);
    try {
      await auth.signIn(values);
    } catch (error) {
      setFailure(submitErrorMessage(error, 'Something went wrong. Please try again.'));
      form.resetField('password');
    }
  };

  const next = searchParams.get('next');
  const withNext = (path: string) => (next ? `${path}?next=${encodeURIComponent(next)}` : path);

  return (
    <AuthPageShell
      title="Sign in"
      intro="Welcome back. Sign in to see your account."
      footer={
        <p>
          New to Prajzo?{' '}
          <Link to={withNext('/register')} className={linkClass}>
            Create an account
          </Link>
        </p>
      }
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
          autoComplete="email"
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
        <p className="-mt-2 text-sm">
          <Link to="/forgot-password" className={linkClass}>
            Forgot your password?
          </Link>
        </p>
        <Button type="submit" size="lg" loading={isSubmitting}>
          <LogIn aria-hidden="true" className="size-4" />
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthPageShell>
  );
}
