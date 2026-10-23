import { CircleAlert, Eye, EyeOff } from 'lucide-react';
import { useId, useState, type ComponentProps, type ReactNode } from 'react';
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

export type TextFieldProps = FieldBaseProps &
  Omit<ComponentProps<'input'>, 'id'> & {
    /** A control shown inside the right edge of the field (for example "show password"). */
    suffix?: ReactNode;
  };

export function TextField({
  id,
  label,
  hint,
  error,
  required,
  className,
  suffix,
  ...props
}: TextFieldProps) {
  const { fieldId, hintId, errorId, describedBy } = useFieldIds(id, hint, error);
  return (
    <div className={cx('grid gap-1.5', className)}>
      <FieldLabel htmlFor={fieldId} required={required}>
        {label}
      </FieldLabel>
      <div className="relative">
        <input
          id={fieldId}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cx(controlClasses(Boolean(error)), suffix ? 'pr-12' : null)}
          {...props}
        />
        {suffix && <div className="absolute inset-y-0 right-1.5 flex items-center">{suffix}</div>}
      </div>
      <FieldMessages hint={hint} hintId={hintId} error={error} errorId={errorId} />
    </div>
  );
}

export type PasswordFieldProps = Omit<TextFieldProps, 'type' | 'suffix'>;

/** A password field with a button to show or hide what is typed (helpful on phones). */
export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      autoCapitalize="none"
      spellCheck={false}
      suffix={
        <button
          type="button"
          aria-pressed={visible}
          onClick={() => setVisible((shown) => !shown)}
          className="grid size-9 place-items-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-blue"
        >
          {visible ? (
            <EyeOff aria-hidden="true" className="size-5" />
          ) : (
            <Eye aria-hidden="true" className="size-5" />
          )}
          <span className="sr-only">{visible ? 'Hide password' : 'Show password'}</span>
        </button>
      }
    />
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
