import { zodResolver } from '@hookform/resolvers/zod';
import {
  demoRegistrationSchema,
  demoSubmissionResponseSchema,
  type DemoRegistrationValues,
  type SectionContent,
} from '@prajzo/shared';
import { useId, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { ApiError, apiRequest } from '../lib/api';
import { useSite } from './context';

type Registration = z.output<typeof demoRegistrationSchema>;
type Outcome =
  | { kind: 'idle' }
  | { kind: 'sent'; choice: string }
  | { kind: 'previewed' }
  | { kind: 'failed'; message: string };

/**
 * A registration form (Event demo, Phase 11). It says "registered" only after the server has
 * saved the registration. On a demo it goes to Prajzo's demo inbox only (D-014); in the
 * builder's preview it checks what was typed but never sends; in a review it can't be used.
 */
export function SiteRegistrationForm({ content }: { content: SectionContent<'registration'> }) {
  const { config, mode } = useSite();
  const [outcome, setOutcome] = useState<Outcome>({ kind: 'idle' });
  const statusRef = useRef<HTMLParagraphElement>(null);
  const formId = useId();
  const empty: DemoRegistrationValues = {
    form: 'registration',
    template: config.template.key,
    name: '',
    email: '',
    phone: '',
    organisation: '',
    choice: '',
    company: '',
  };
  const form = useForm<DemoRegistrationValues, unknown, Registration>({
    resolver: zodResolver(demoRegistrationSchema),
    defaultValues: empty,
  });
  const { errors, isSubmitting } = form.formState;
  const disabled = mode === 'review';

  const show = (next: Outcome) => {
    setOutcome(next);
    requestAnimationFrame(() => statusRef.current?.focus());
  };

  const send = async (values: Registration) => {
    if (mode === 'preview') {
      show({ kind: 'previewed' });
      return;
    }
    setOutcome({ kind: 'idle' });
    try {
      await apiRequest('/v1/demo-submissions', demoSubmissionResponseSchema, {
        method: 'POST',
        body: JSON.stringify(values),
      });
      form.reset(empty);
      show({ kind: 'sent', choice: values.choice });
    } catch (error) {
      if (error instanceof ApiError && error.fields) {
        for (const [field, message] of Object.entries(error.fields)) {
          if (
            field === 'name' ||
            field === 'email' ||
            field === 'phone' ||
            field === 'organisation' ||
            field === 'choice'
          ) {
            form.setError(field, { message });
          }
        }
      }
      show({
        kind: 'failed',
        message:
          error instanceof ApiError
            ? error.message
            : 'The registration could not be sent. Check your connection and try again.',
      });
    }
  };

  type Field = 'name' | 'email' | 'phone' | 'organisation' | 'choice';
  const field = (name: Field) => ({
    id: `${formId}-${name}`,
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `${formId}-${name}-error` : undefined,
    disabled,
    ...form.register(name),
  });
  const errorOf = (name: Field) =>
    errors[name] ? (
      <span id={`${formId}-${name}-error`} className="ps-field-error">
        {errors[name].message}
      </span>
    ) : null;

  return (
    <form
      className="ps-form"
      noValidate
      aria-label="Registration form"
      onSubmit={(event) => void form.handleSubmit(send)(event)}
    >
      <div className="ps-field">
        <label htmlFor={`${formId}-name`}>Name</label>
        <input type="text" autoComplete="name" {...field('name')} />
        {errorOf('name')}
      </div>
      <div className="ps-field">
        <label htmlFor={`${formId}-email`}>Email</label>
        <input type="email" autoComplete="email" inputMode="email" {...field('email')} />
        {errorOf('email')}
      </div>
      {content.askPhone ? (
        <div className="ps-field">
          <label htmlFor={`${formId}-phone`}>Phone (optional)</label>
          <input type="tel" autoComplete="tel" inputMode="tel" {...field('phone')} />
          {errorOf('phone')}
        </div>
      ) : null}
      {content.askOrganisation ? (
        <div className="ps-field">
          <label htmlFor={`${formId}-organisation`}>{content.organisationLabel} (optional)</label>
          <input type="text" autoComplete="organization" {...field('organisation')} />
          {errorOf('organisation')}
        </div>
      ) : null}
      <div className="ps-field">
        <label htmlFor={`${formId}-choice`}>{content.eventLabel}</label>
        <select {...field('choice')}>
          <option value="">Choose one…</option>
          {content.events.map((event) => (
            <option key={event} value={event}>
              {event}
            </option>
          ))}
        </select>
        {errorOf('choice')}
      </div>
      <div className="ps-trap" aria-hidden="true">
        <label htmlFor={`${formId}-company`}>Company</label>
        <input
          id={`${formId}-company`}
          tabIndex={-1}
          autoComplete="off"
          {...form.register('company')}
        />
      </div>
      <div className="ps-form-actions">
        <button
          type="submit"
          className="ps-button ps-button-primary"
          disabled={disabled || isSubmitting}
        >
          {isSubmitting ? 'Registering…' : 'Register'}
        </button>
        {mode === 'demo' ? (
          <p className="ps-form-note">
            Demo form: registrations go to Prajzo only, and are deleted after 7 days.
          </p>
        ) : null}
      </div>
      <p
        ref={statusRef}
        tabIndex={-1}
        role={outcome.kind === 'failed' ? 'alert' : 'status'}
        className={`ps-form-status ps-form-status-${outcome.kind}`}
        hidden={outcome.kind === 'idle'}
      >
        {outcome.kind === 'sent'
          ? `You're registered for ${outcome.choice}.${content.closingNote ? ` ${content.closingNote}` : ''}`
          : outcome.kind === 'previewed'
            ? 'Everything is filled in correctly. In the preview the form doesn’t send; it does on the live website.'
            : outcome.kind === 'failed'
              ? outcome.message
              : ''}
      </p>
    </form>
  );
}
