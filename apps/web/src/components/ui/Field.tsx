import { CircleAlert } from 'lucide-react';
import { useId, type ComponentProps, type ReactNode } from 'react';
import { cx } from '../../lib/cx';

type FieldBaseProps = {
  id?: string;
  label: ReactNode;
  /** Short help shown under the label and read out with the field. */
  hint?: ReactNode;
  /** Error message; marks the field invalid and is read out with the field. */
  error?: string;
};

function useFieldIds(id: string | undefined, hint: ReactNode, error: string | undefined) {
  const generated = useId();
  const fieldId = id ?? generated;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  return { fieldId, hintId, errorId, describedBy: cx(hintId, errorId) || undefined };
}

function controlClasses(invalid: boolean): string {
  return cx(
    'block w-full rounded-xl border bg-white px-3.5 py-2.5 text-[0.9375rem] text-ink shadow-xs transition',
    'placeholder:text-slate-400 focus:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:bg-slate-50',
    invalid
      ? 'border-rose-500 focus-visible:border-rose-600 focus-visible:ring-rose-500/15'
      : 'border-slate-300 hover:border-slate-400 focus-visible:border-brand-blue focus-visible:ring-brand-blue/15',
  );
}

function FieldMessages({
  hint,
  hintId,
  error,
  errorId,
  indent = false,
}: {
  hint: ReactNode;
  hintId: string | undefined;
  error: string | undefined;
  errorId: string | undefined;
  indent?: boolean;
}) {
  return (
    <>
      {hint && (
        <p id={hintId} className={cx('text-sm text-slate-600', indent && 'pl-8')}>
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          className={cx(
            'flex items-start gap-1.5 text-sm font-medium text-rose-700',
            indent && 'pl-8',
          )}
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}
    </>
  );
}

function FieldLabel({
  htmlFor,
  required,
  children,
}: {
  htmlFor: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
      {children}
      {required && (
        <span aria-hidden="true" className="text-rose-600">
          {' '}
          *
        </span>
      )}
    </label>
  );
}

export type TextFieldProps = FieldBaseProps & Omit<ComponentProps<'input'>, 'id'>;

export function TextField({
  id,
  label,
  hint,
  error,
  required,
  className,
  ...props
}: TextFieldProps) {
  const { fieldId, hintId, errorId, describedBy } = useFieldIds(id, hint, error);
  return (
    <div className={cx('grid gap-1.5', className)}>
      <FieldLabel htmlFor={fieldId} required={required}>
        {label}
      </FieldLabel>
      <input
        id={fieldId}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={controlClasses(Boolean(error))}
        {...props}
      />
      <FieldMessages hint={hint} hintId={hintId} error={error} errorId={errorId} />
    </div>
  );
}

export type TextAreaFieldProps = FieldBaseProps & Omit<ComponentProps<'textarea'>, 'id'>;

export function TextAreaField({
  id,
  label,
  hint,
  error,
  required,
  className,
  rows = 5,
  ...props
}: TextAreaFieldProps) {
  const { fieldId, hintId, errorId, describedBy } = useFieldIds(id, hint, error);
  return (
    <div className={cx('grid gap-1.5', className)}>
      <FieldLabel htmlFor={fieldId} required={required}>
        {label}
      </FieldLabel>
      <textarea
        id={fieldId}
        rows={rows}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cx(controlClasses(Boolean(error)), 'resize-y')}
        {...props}
      />
      <FieldMessages hint={hint} hintId={hintId} error={error} errorId={errorId} />
    </div>
  );
}

export type SelectFieldProps = FieldBaseProps & Omit<ComponentProps<'select'>, 'id'>;

export function SelectField({
  id,
  label,
  hint,
  error,
  required,
  className,
  children,
  ...props
}: SelectFieldProps) {
  const { fieldId, hintId, errorId, describedBy } = useFieldIds(id, hint, error);
  return (
    <div className={cx('grid gap-1.5', className)}>
      <FieldLabel htmlFor={fieldId} required={required}>
        {label}
      </FieldLabel>
      <select
        id={fieldId}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cx(controlClasses(Boolean(error)), 'pr-10')}
        {...props}
      >
        {children}
      </select>
      <FieldMessages hint={hint} hintId={hintId} error={error} errorId={errorId} />
    </div>
  );
}

export type CheckboxFieldProps = FieldBaseProps & Omit<ComponentProps<'input'>, 'id' | 'type'>;

export function CheckboxField({ id, label, hint, error, className, ...props }: CheckboxFieldProps) {
  const { fieldId, hintId, errorId, describedBy } = useFieldIds(id, hint, error);
  return (
    <div className={cx('grid gap-1', className)}>
      <div className="flex items-start gap-3">
        <input
          id={fieldId}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="mt-0.5 size-5 shrink-0 cursor-pointer rounded-md accent-brand-indigo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
          {...props}
        />
        <label htmlFor={fieldId} className="cursor-pointer text-[0.9375rem] text-ink">
          {label}
        </label>
      </div>
      <FieldMessages hint={hint} hintId={hintId} error={error} errorId={errorId} indent />
    </div>
  );
}
