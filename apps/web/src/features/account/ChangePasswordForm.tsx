import { zodResolver } from '@hookform/resolvers/zod';
import {
  changePasswordRequestSchema,
  okResponseSchema,
  passwordMinLength,
  type ChangePasswordFormValues,
} from '@prajzo/shared';
import { KeyRound } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { PasswordField } from '../../components/ui/Field';
import { apiRequest } from '../../lib/api';
import { applyServerFieldErrors, submitErrorMessage } from '../../lib/form-errors';

const emptyForm: ChangePasswordFormValues = { currentPassword: '', newPassword: '' };

export function ChangePasswordForm() {
  const [outcome, setOutcome] = useState<
    { kind: 'idle' } | { kind: 'changed'; message: string } | { kind: 'failed'; message: string }
  >({ kind: 'idle' });

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordRequestSchema),
    defaultValues: emptyForm,
  });
  const { errors, isSubmitting } = form.formState;

  const change = async (values: ChangePasswordFormValues) => {
    setOutcome({ kind: 'idle' });
    try {
      const response = await apiRequest('/v1/me/password', okResponseSchema, {
        method: 'POST',
        body: JSON.stringify(values),
      });
      form.reset(emptyForm);
      setOutcome({ kind: 'changed', message: response.message });
    } catch (error) {
      applyServerFieldErrors(form.setError, error, ['currentPassword', 'newPassword']);
      setOutcome({
        kind: 'failed',
        message: submitErrorMessage(error, 'Something went wrong. Please try again.'),
      });
    }
  };

  return (
    <form
      noValidate
      onSubmit={(event) => void form.handleSubmit(change)(event)}
      className="grid gap-5"
    >
      {outcome.kind === 'changed' && (
        <Alert tone="success" title="Password changed">
          {outcome.message}
        </Alert>
      )}
      {outcome.kind === 'failed' && (
        <Alert tone="error" title="Your password wasn't changed">
          {outcome.message}
        </Alert>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <PasswordField
          label="Current password"
          autoComplete="current-password"
          required
          error={errors.currentPassword?.message}
          {...form.register('currentPassword')}
        />
        <PasswordField
          label="New password"
          autoComplete="new-password"
          required
          hint={`At least ${passwordMinLength} characters.`}
          error={errors.newPassword?.message}
          {...form.register('newPassword')}
        />
      </div>
      <Button
        type="submit"
        variant="secondary"
        loading={isSubmitting}
        className="justify-self-start"
      >
        <KeyRound aria-hidden="true" className="size-4" />
        {isSubmitting ? 'Changing…' : 'Change password'}
      </Button>
    </form>
  );
}
