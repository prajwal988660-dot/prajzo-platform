import { zodResolver } from '@hookform/resolvers/zod';
import {
  sessionResponseSchema,
  updateProfileRequestSchema,
  type PublicUser,
  type UpdateProfileFormValues,
} from '@prajzo/shared';
import { Save } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { apiRequest } from '../../lib/api';
import { applyServerFieldErrors, submitErrorMessage } from '../../lib/form-errors';
import { useAuth } from '../auth/auth-context';

export function ProfileForm({ user }: { user: PublicUser }) {
  const auth = useAuth();
  const [outcome, setOutcome] = useState<
    { kind: 'idle' } | { kind: 'saved' } | { kind: 'failed'; message: string }
  >({ kind: 'idle' });

  const form = useForm<UpdateProfileFormValues>({
    resolver: zodResolver(updateProfileRequestSchema),
    defaultValues: { name: user.name, phone: user.phone ?? '' },
  });
  const { errors, isSubmitting } = form.formState;

  const save = async (values: UpdateProfileFormValues) => {
    setOutcome({ kind: 'idle' });
    try {
      const { user: updated } = await apiRequest('/v1/me', sessionResponseSchema, {
        method: 'PATCH',
        body: JSON.stringify(values),
      });
      if (updated) {
        auth.setUser(updated);
        form.reset({ name: updated.name, phone: updated.phone ?? '' });
      }
      setOutcome({ kind: 'saved' });
    } catch (error) {
      applyServerFieldErrors(form.setError, error, ['name', 'phone']);
      setOutcome({
        kind: 'failed',
        message: submitErrorMessage(error, 'Something went wrong. Please try again.'),
      });
    }
  };

  return (
    <form
      noValidate
      onSubmit={(event) => void form.handleSubmit(save)(event)}
      className="grid gap-5"
    >
      {outcome.kind === 'saved' && (
        <Alert tone="success" title="Saved">
          Your details have been updated.
        </Alert>
      )}
      {outcome.kind === 'failed' && (
        <Alert tone="error" title="Your details weren't saved">
          {outcome.message}
        </Alert>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Your name"
          autoComplete="name"
          required
          error={errors.name?.message}
          {...form.register('name')}
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
      </div>
      <p className="text-sm text-slate-600">
        Email: <strong className="font-semibold text-ink">{user.email}</strong>. To change it,
        contact us.
      </p>
      <Button type="submit" loading={isSubmitting} className="justify-self-start">
        <Save aria-hidden="true" className="size-4" />
        {isSubmitting ? 'Saving…' : 'Save details'}
      </Button>
    </form>
  );
}
