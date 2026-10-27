import { zodResolver } from '@hookform/resolvers/zod';
import {
  forgotPasswordRequestSchema,
  okResponseSchema,
  type ForgotPasswordFormValues,
} from '@prajzo/shared';
import { Mail } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { apiRequest } from '../../lib/api';
import { submitErrorMessage } from '../../lib/form-errors';
import { usePageMeta } from '../../lib/use-page-meta';
import { AuthPageShell } from './AuthPageShell';

const linkClass = 'font-medium text-brand-indigo underline underline-offset-2';

export function ForgotPasswordPage() {
  usePageMeta('/forgot-password');
  const [outcome, setOutcome] = useState<
    { kind: 'idle' } | { kind: 'sent'; message: string } | { kind: 'failed'; message: string }
  >({ kind: 'idle' });

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordRequestSchema),
    defaultValues: { email: '' },
  });
  const { errors, isSubmitting } = form.formState;

  const send = async (values: ForgotPasswordFormValues) => {
    setOutcome({ kind: 'idle' });
    try {
      const response = await apiRequest('/v1/auth/password/forgot', okResponseSchema, {
        method: 'POST',
        body: JSON.stringify(values),
      });
      setOutcome({ kind: 'sent', message: response.message });
    } catch (error) {
      setOutcome({
        kind: 'failed',
        message: submitErrorMessage(error, 'Something went wrong. Please try again.'),
      });
    }
  };

  return (
    <AuthPageShell
      title="Forgot your password?"
      intro="Enter your email address and we'll send you a link to choose a new one."
      footer={
        <p>
          Remembered it?{' '}
          <Link to="/login" className={linkClass}>
            Back to sign in
          </Link>
        </p>
      }
    >
      {outcome.kind === 'sent' ? (
        <div className="grid gap-4">
          <Alert tone="success" title="Check your email">
            {outcome.message} The link works once and expires in one hour.
          </Alert>
          <p className="text-sm text-slate-600">
            Nothing arrived? Check your spam folder, or{' '}
            <button
              type="button"
              className={`${linkClass} cursor-pointer`}
              onClick={() => setOutcome({ kind: 'idle' })}
            >
              try again
            </button>
            .
          </p>
        </div>
      ) : (
        <form
          noValidate
          onSubmit={(event) => void form.handleSubmit(send)(event)}
          className="grid gap-5"
        >
          {outcome.kind === 'failed' && (
            <Alert tone="error" title="We couldn't send the link">
              {outcome.message}
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
          <Button type="submit" size="lg" loading={isSubmitting}>
            <Mail aria-hidden="true" className="size-4" />
            {isSubmitting ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
      )}
    </AuthPageShell>
  );
}
