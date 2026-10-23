import { zodResolver } from '@hookform/resolvers/zod';
import {
  passwordMinLength,
  registerRequestSchema,
  type RegisterFormValues,
  type RegisterRequest,
} from '@prajzo/shared';
import { UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { CheckboxField, PasswordField, TextField } from '../../components/ui/Field';
import { applyServerFieldErrors, submitErrorMessage } from '../../lib/form-errors';
import { usePageTitle } from '../../lib/use-page-title';
import { useAuth } from './auth-context';
import { AuthPageShell } from './AuthPageShell';

const linkClass = 'font-medium text-brand-indigo underline underline-offset-2';
const fields = ['name', 'email', 'phone', 'password', 'acceptTerms'] as const;

export function RegisterPage() {
  usePageTitle('Create an account');
  const auth = useAuth();
  const [searchParams] = useSearchParams();
  const [failure, setFailure] = useState<string | null>(null);

  const form = useForm<RegisterFormValues, unknown, RegisterRequest>({
    resolver: zodResolver(registerRequestSchema),
    defaultValues: { name: '', email: '', phone: '', password: '', acceptTerms: false },
  });
  const { errors, isSubmitting } = form.formState;

  // After a successful sign-up the person is signed in, and the page guard sends them on.
  const register = async (values: RegisterRequest) => {
    setFailure(null);
    try {
      await auth.register(values);
    } catch (error) {
      applyServerFieldErrors(form.setError, error, fields);
      setFailure(submitErrorMessage(error, 'Something went wrong. Please try again.'));
    }
  };

  const next = searchParams.get('next');

  return (
    <AuthPageShell
      title="Create your account"
      intro="Save your designs, send projects and follow their progress. It's free."
      footer={
        <p>
          Already have an account?{' '}
          <Link
            to={next ? `/login?next=${encodeURIComponent(next)}` : '/login'}
            className={linkClass}
          >
            Sign in
          </Link>
        </p>
      }
    >
      <form
        noValidate
        onSubmit={(event) => void form.handleSubmit(register)(event)}
        className="grid gap-5"
      >
        {failure && (
          <Alert tone="error" title="We couldn't create your account">
            {failure}
          </Alert>
        )}
        <TextField
          label="Your name"
          autoComplete="name"
          required
          error={errors.name?.message}
          {...form.register('name')}
        />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          error={errors.email?.message}
          {...form.register('email')}
        />
        <TextField
          label="Phone or WhatsApp"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          hint="Optional."
          error={errors.phone?.message}
          {...form.register('phone')}
        />
        <PasswordField
          label="Password"
          autoComplete="new-password"
          required
          hint={`At least ${passwordMinLength} characters. A few random words make a strong, easy-to-remember password.`}
          error={errors.password?.message}
          {...form.register('password')}
        />
        <CheckboxField
          label={
            <>
              I agree to the{' '}
              <Link to="/terms" target="_blank" rel="noopener noreferrer" className={linkClass}>
                Terms and Conditions<span className="sr-only"> (opens in a new tab)</span>
              </Link>{' '}
              and the{' '}
              <Link to="/privacy" target="_blank" rel="noopener noreferrer" className={linkClass}>
                Privacy Policy<span className="sr-only"> (opens in a new tab)</span>
              </Link>
              .
            </>
          }
          error={errors.acceptTerms?.message}
          {...form.register('acceptTerms')}
        />
        <Button type="submit" size="lg" loading={isSubmitting}>
          <UserPlus aria-hidden="true" className="size-4" />
          {isSubmitting ? 'Creating your account…' : 'Create account'}
        </Button>
      </form>
    </AuthPageShell>
  );
}
