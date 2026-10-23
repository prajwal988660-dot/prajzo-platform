import { zodResolver } from '@hookform/resolvers/zod';
import {
  okResponseSchema,
  passwordMinLength,
  resetPasswordRequestSchema,
  type ResetPasswordFormValues,
} from '@prajzo/shared';
import { KeyRound } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router';
import { Alert } from '../../components/ui/Alert';
import { Button, ButtonLink } from '../../components/ui/Button';
import { PasswordField } from '../../components/ui/Field';
import { apiRequest } from '../../lib/api';
import { applyServerFieldErrors, submitErrorMessage } from '../../lib/form-errors';
import { usePageTitle } from '../../lib/use-page-title';
import { AuthPageShell } from './AuthPageShell';

const linkClass = 'font-medium text-brand-indigo underline underline-offset-2';

export function ResetPasswordPage() {
  usePageTitle('Choose a new password');
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [outcome, setOutcome] = useState<
    { kind: 'idle' } | { kind: 'done'; message: string } | { kind: 'failed'; message: string }
  >({ kind: 'idle' });

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordRequestSchema),
    defaultValues: { token, password: '' },
  });
  const { errors, isSubmitting } = form.formState;

  const submit = async (values: ResetPasswordFormValues) => {
    setOutcome({ kind: 'idle' });
    try {
      const response = await apiRequest('/v1/auth/password/reset', okResponseSchema, {
        method: 'POST',
        body: JSON.stringify(values),
      });
      setOutcome({ kind: 'done', message: response.message });
    } catch (error) {
      applyServerFieldErrors(form.setError, error, ['password']);
      setOutcome({
        kind: 'failed',
        message: submitErrorMessage(error, 'Something went wrong. Please try again.'),
      });
    }
  };

  if (token.length < 20) {
    return (
      <AuthPageShell title="This link is incomplete">
        <Alert tone="warning" title="We can't use this link">
          It may have been cut short when it was copied. Open the link from your email again, or
          request a new one.
        </Alert>
        <ButtonLink to="/forgot-password" className="mt-6">
          Request a new link
        </ButtonLink>
      </AuthPageShell>
    );
  }

  if (outcome.kind === 'done') {
    return (
      <AuthPageShell title="Password changed">
        <Alert tone="success" title="All set">
          {outcome.message}
        </Alert>
        <ButtonLink to="/login" size="lg" className="mt-6 w-full">
          Sign in
        </ButtonLink>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell
      title="Choose a new password"
      footer={
        <p>
          Need a fresh link?{' '}
          <Link to="/forgot-password" className={linkClass}>
            Request another
          </Link>
        </p>
      }
    >
      <form
        noValidate
        onSubmit={(event) => void form.handleSubmit(submit)(event)}
        className="grid gap-5"
      >
        {outcome.kind === 'failed' && (
          <Alert tone="error" title="We couldn't change your password">
            {outcome.message}
          </Alert>
        )}
        <input type="hidden" {...form.register('token')} />
        <PasswordField
          label="New password"
          autoComplete="new-password"
          required
          hint={`At least ${passwordMinLength} characters.`}
          error={errors.password?.message}
          {...form.register('password')}
        />
        <Button type="submit" size="lg" loading={isSubmitting}>
          <KeyRound aria-hidden="true" className="size-4" />
          {isSubmitting ? 'Saving…' : 'Change password'}
        </Button>
      </form>
    </AuthPageShell>
  );
}
