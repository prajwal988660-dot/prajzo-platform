import { zodResolver } from '@hookform/resolvers/zod';
import {
  demoEnquirySchema,
  demoSubmissionResponseSchema,
  type DemoEnquiryValues,
  type SectionContent,
} from '@prajzo/shared';
import { useEffect, useId, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { ApiError, apiRequest } from '../lib/api';
import { productNames, useEnquiry } from './enquiry-context';
import { useSite } from './context';

type Enquiry = z.output<typeof demoEnquirySchema>;
type Outcome =
  | { kind: 'idle' }
  | { kind: 'sent'; product: string }
  | { kind: 'previewed' }
  | { kind: 'failed'; message: string };
type Field = 'name' | 'email' | 'phone' | 'choice' | 'quantity' | 'message';

/**
 * An enquiry about a product (Catalogue demo, Phase 12): there is no checkout. Its product list
 * comes from the products on the page, and "Enquire" on a product starts the form with that
 * product. It says "sent" only after the server has saved it; on a demo it goes to Prajzo's demo
 * inbox only (D-014); in the builder's preview it never sends.
 */
export function SiteEnquiryForm({ content }: { content: SectionContent<'enquiry'> }) {
  const { config, mode } = useSite();
  const { product } = useEnquiry();
  const products = productNames(config);
  const [outcome, setOutcome] = useState<Outcome>({ kind: 'idle' });
  const statusRef = useRef<HTMLParagraphElement>(null);
  const formId = useId();
  const empty: DemoEnquiryValues = {
    form: 'enquiry',
    template: config.template.key,
    name: '',
    email: '',
    phone: '',
    choice: '',
    quantity: '',
    message: '',
    company: '',
  };
  const form = useForm<DemoEnquiryValues, unknown, Enquiry>({
    resolver: zodResolver(demoEnquirySchema),
    defaultValues: empty,
  });
  const { errors, isSubmitting } = form.formState;
  const disabled = mode === 'review';

  // "Enquire" on a product: start the form with it, and put the visitor on the product list.
  useEffect(() => {
    if (!product) return;
    form.setValue('choice', product, { shouldValidate: false });
    document.getElementById(`${formId}-choice`)?.focus();
  }, [product, form, formId]);

  const show = (next: Outcome) => {
    setOutcome(next);
    requestAnimationFrame(() => statusRef.current?.focus());
  };

  const send = async (values: Enquiry) => {
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
      show({ kind: 'sent', product: values.choice });
    } catch (error) {
      if (error instanceof ApiError && error.fields) {
        for (const [field, message] of Object.entries(error.fields)) {
          if (['name', 'email', 'phone', 'choice', 'quantity', 'message'].includes(field)) {
            form.setError(field as Field, { message });
          }
        }
      }
      show({
        kind: 'failed',
        message:
          error instanceof ApiError
            ? error.message
            : 'The enquiry could not be sent. Check your connection and try again.',
      });
    }
  };

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
      aria-label="Enquiry form"
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
      <div className="ps-field">
        <label htmlFor={`${formId}-choice`}>Product</label>
        <select {...field('choice')}>
          <option value="">Choose a product…</option>
          {products.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        {errorOf('choice')}
      </div>
      {content.askQuantity ? (
        <div className="ps-field">
          <label htmlFor={`${formId}-quantity`}>How many (optional)</label>
          <input type="number" inputMode="numeric" min={1} max={10000} {...field('quantity')} />
          {errorOf('quantity')}
        </div>
      ) : null}
      <div className="ps-field">
        <label htmlFor={`${formId}-message`}>Anything else? (optional)</label>
        <textarea rows={3} {...field('message')} />
        {errorOf('message')}
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
          {isSubmitting ? 'Sending…' : 'Send enquiry'}
        </button>
        {mode === 'demo' ? (
          <p className="ps-form-note">
            Demo form: enquiries go to Prajzo only, and are deleted after 7 days.
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
          ? `Thank you. Your enquiry about the ${outcome.product} was received.${content.closingNote ? ` ${content.closingNote}` : ''}`
          : outcome.kind === 'previewed'
            ? 'Everything is filled in correctly. In the preview the form doesn’t send; it does on the live website.'
            : outcome.kind === 'failed'
              ? outcome.message
              : ''}
      </p>
    </form>
  );
}
