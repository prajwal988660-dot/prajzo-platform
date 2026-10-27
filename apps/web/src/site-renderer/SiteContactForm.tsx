import { zodResolver } from '@hookform/resolvers/zod';
import {
  demoSubmissionRequestSchema,
  demoSubmissionResponseSchema,
  type DemoSubmissionRequest,
  type DemoSubmissionValues,
} from '@prajzo/shared';
import { useId, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ApiError, apiRequest } from '../lib/api';
import { useSite } from './context';

type Outcome =
  { kind: 'idle' } | { kind: 'sent' } | { kind: 'previewed' } | { kind: 'failed'; message: string };

/**
 * The contact form of a site. On a demo it really sends, to Prajzo's demo inbox only (D-014),
 * and says so only after the server confirms. In the builder's preview it checks what was typed
 * but never sends; in an admin review it can't be used.
 */
export function SiteContactForm() {
  const { config, mode } = useSite();
  const [outcome, setOutcome] = useState<Outcome>({ kind: 'idle' });
  const statusRef = useRef<HTMLParagraphElement>(null);
  const formId = useId();
  const empty = { template: config.template.key, name: '', email: '', message: '', company: '' };
  const form = useForm<DemoSubmissionValues, unknown, DemoSubmissionRequest>({
    resolver: zodResolver(demoSubmissionRequestSchema),
    defaultValues: empty,
  });
  const { errors, isSubmitting } = form.formState;
  const disabled = mode === 'review';

  const show = (next: Outcome) => {
    setOutcome(next);
    // Screen readers hear the result; everyone sees it next to the button.
    requestAnimationFrame(() => statusRef.current?.focus());
  };

  const send = async (values: DemoSubmissionRequest) => {
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
      show({ kind: 'sent' });
    } catch (error) {
      if (error instanceof ApiError && error.fields) {
        for (const [field, message] of Object.entries(error.fields)) {
          if (field === 'name' || field === 'email' || field === 'message') {
            form.setError(field, { message });
          }
        }
      }
      show({
        kind: 'failed',
        message:
          error instanceof ApiError
            ? error.message
            : 'The message could not be sent. Check your connection and try again.',
      });
    }
  };

  const field = (name: 'name' | 'email' | 'message') => ({
    id: `${formId}-${name}`,
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `${formId}-${name}-error` : undefined,
    disabled,
    ...form.register(name),
  });
  const errorOf = (name: 'name' | 'email' | 'message') =>
    errors[name] ? (
      <span id={`${formId}-${name}-error`} className="ps-field-error">
        {errors[name].message}
      </span>
    ) : null;

  return (
    <form
      className="ps-form"
      noValidate
      aria-label="Contact form"
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
      <div className="ps-field">
        <label htmlFor={`${formId}-message`}>Message</label>
        <textarea rows={5} {...field('message')} />
        {errorOf('message')}
      </div>
      {/* Spam trap: hidden from people and from screen readers. */}
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
          {isSubmitting ? 'Sending…' : 'Send message'}
        </button>
        {mode === 'demo' ? (
          <p className="ps-form-note">
            Demo form: messages go to Prajzo only, and are deleted after 7 days.
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
          ? 'Thank you. Your message was received.'
          : outcome.kind === 'previewed'
            ? 'Everything is filled in correctly. In the preview the form doesn’t send; it does on the live website.'
            : outcome.kind === 'failed'
              ? outcome.message
              : ''}
      </p>
    </form>
  );
}
