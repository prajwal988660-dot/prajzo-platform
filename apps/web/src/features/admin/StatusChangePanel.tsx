import { zodResolver } from '@hookform/resolvers/zod';
import {
  deliveryDateSchema,
  isFinalStatus,
  optionalText,
  projectStatusInfo,
  quoteInputSchema,
  requiredText,
  todayInIndia,
  type AdminProjectDetail,
  type AllowedChange,
  type ProjectStatus,
} from '@prajzo/shared';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { CheckboxField, SelectField, TextAreaField, TextField } from '../../components/ui/Field';
import { applyServerFieldErrors } from '../../lib/form-errors';
import type { Notice } from '../projects/use-project-action';
import { useAdminProjectAction } from './use-admin-action';

type PanelProps = {
  project: AdminProjectDetail;
  onDone: (project: AdminProjectDetail, notice: Notice | null) => void;
  onOutOfDate: (message: string) => void;
};
type MoveProps = PanelProps & { change: AllowedChange };

/**
 * Moving a project on. The choices are exactly the moves the server says are allowed from the
 * project's current status, and each one asks for what it needs: a quote, a delivery date, a note
 * the customer will see, or nothing. The server checks all of it again.
 */
export function StatusChangePanel({ project, onDone, onOutOfDate }: PanelProps) {
  const [chosen, setChosen] = useState('');
  const change = project.allowedChanges.find((candidate) => candidate.to === chosen);

  return (
    <section aria-labelledby="move-heading">
      <h2 id="move-heading" className="text-xl font-semibold tracking-tight">
        Move this project on
      </h2>
      <Card className="mt-4 grid gap-5">
        {project.allowedChanges.length === 0 ? (
          <p className="text-slate-700">
            This project is {projectStatusInfo[project.status].label}. Its status can&apos;t be
            changed any more.
          </p>
        ) : (
          <>
            <SelectField
              label="Move to"
              hint="Only the moves that are allowed from here are listed."
              value={change ? change.to : ''}
              onChange={(event) => setChosen(event.target.value)}
            >
              <option value="">Choose a status…</option>
              {project.allowedChanges.map((allowed) => (
                <option key={allowed.to} value={allowed.to}>
                  {projectStatusInfo[allowed.to].label}
                </option>
              ))}
            </SelectField>
            {change && (
              <div className="grid gap-4">
                <p className="text-sm text-slate-600">
                  The customer will see: &ldquo;{projectStatusInfo[change.to].meaning}&rdquo;
                </p>
                {/* Keyed by the target, so switching to another move starts a fresh form. */}
                <MoveForm
                  key={change.to}
                  project={project}
                  change={change}
                  onDone={onDone}
                  onOutOfDate={onOutOfDate}
                />
              </div>
            )}
          </>
        )}
      </Card>
    </section>
  );
}

function MoveForm(props: MoveProps) {
  switch (props.change.needs) {
    case 'quote':
      return <SendQuoteForm {...props} />;
    case 'deliveryDate':
      return <ConfirmDateForm {...props} />;
    case 'note':
      return <NoteMoveForm {...props} />;
    case null:
      return <PlainMoveForm {...props} />;
  }
}

/** Sends the move to the server and says what to tell the admin when it works. */
function useMove({ project, change, onDone, onOutOfDate }: MoveProps) {
  const { state, run } = useAdminProjectAction(project.reference, onDone, onOutOfDate);
  const notice: Notice = {
    title: `Moved to ${projectStatusInfo[change.to].label}`,
    text:
      change.to === 'quote-sent'
        ? 'The quote was sent. The customer can read it on their project page.'
        : 'The customer can see the new status on their project page.',
  };
  const send = (extra: Record<string, unknown>) =>
    run('status', { to: change.to, ...extra }, notice);
  return { state, send, message: state.kind === 'failed' ? state.message : null };
}

/** The error box and the submit button. Final moves need a tick first, since they can't be undone. */
function MoveFooter({
  to,
  working,
  message,
}: {
  to: ProjectStatus;
  working: boolean;
  message: string | null;
}) {
  const [understood, setUnderstood] = useState(false);
  const { label } = projectStatusInfo[to];
  const final = isFinalStatus(to);
  return (
    <>
      {final && (
        <CheckboxField
          label={`I understand that “${label}” is final. The project can't be moved again.`}
          checked={understood}
          onChange={(event) => setUnderstood(event.target.checked)}
        />
      )}
      {message && (
        <Alert tone="error" title="The status wasn't changed">
          {message}
        </Alert>
      )}
      <Button
        type="submit"
        loading={working}
        disabled={final && !understood}
        className="justify-self-start"
      >
        {working ? 'Saving…' : to === 'quote-sent' ? 'Send quote' : `Move to ${label}`}
      </Button>
    </>
  );
}

// ---------- A move that needs nothing but may carry a note

const plainSchema = z.object({ note: optionalText(1000) });

function PlainMoveForm(props: MoveProps) {
  const { send, message } = useMove(props);
  const form = useForm<z.input<typeof plainSchema>, unknown, z.output<typeof plainSchema>>({
    resolver: zodResolver(plainSchema),
    defaultValues: { note: '' },
  });
  const submit = async ({ note }: z.output<typeof plainSchema>) => {
    const result = await send({ note });
    if (!result.ok) applyServerFieldErrors(form.setError, result.error, ['note']);
  };

  return (
    <form
      noValidate
      onSubmit={(event) => void form.handleSubmit(submit)(event)}
      className="grid gap-4"
    >
      <TextAreaField
        label="Note for the customer (optional)"
        rows={3}
        hint="The customer will see this on their project page."
        error={form.formState.errors.note?.message}
        {...form.register('note')}
      />
      <MoveFooter to={props.change.to} working={form.formState.isSubmitting} message={message} />
    </form>
  );
}

// ---------- A move that needs a note the customer will read

const noteWording: Partial<
  Record<ProjectStatus, { label: string; hint: string; missing: string }>
> = {
  'awaiting-information': {
    label: 'Your question for the customer',
    hint: "They'll see this on their project page and can answer there.",
    missing: 'Write the question, or say what you need, so the customer knows what to send',
  },
  cancelled: {
    label: 'Why is this project being cancelled?',
    hint: 'The customer will see this.',
    missing: 'Say why the project is being cancelled. The customer will see it',
  },
  approved: {
    label: 'How did the customer accept the quote?',
    hint: 'Only use this if they accepted outside the site, for example: "Accepted on WhatsApp on 24 Oct".',
    missing: 'Say how the customer accepted, for example "Accepted on WhatsApp on 24 Oct"',
  },
  'revision-requested': {
    label: 'What did the customer ask to change?',
    hint: 'Write it as they asked. It counts as one of their rounds of changes.',
    missing: 'Write what the customer asked to change',
  },
};
const genericNoteWording = {
  label: 'Note for the customer',
  hint: 'The customer will see this on their project page.',
  missing: 'Write a short note. The customer will see it',
};

type NoteValues = { note: string };

function NoteMoveForm(props: MoveProps) {
  const { send, message } = useMove(props);
  const words = noteWording[props.change.to] ?? genericNoteWording;
  const schema = useMemo(() => z.object({ note: requiredText(2, 1000, words.missing) }), [words]);
  const form = useForm<NoteValues>({ resolver: zodResolver(schema), defaultValues: { note: '' } });
  const submit = async ({ note }: NoteValues) => {
    const result = await send({ note });
    if (!result.ok) applyServerFieldErrors(form.setError, result.error, ['note']);
  };

  return (
    <form
      noValidate
      onSubmit={(event) => void form.handleSubmit(submit)(event)}
      className="grid gap-4"
    >
      <TextAreaField
        label={words.label}
        required
        rows={4}
        hint={words.hint}
        error={form.formState.errors.note?.message}
        {...form.register('note')}
      />
      <MoveFooter to={props.change.to} working={form.formState.isSubmitting} message={message} />
    </form>
  );
}

// ---------- A move that needs a delivery date

const dateSchema = z.object({
  confirmedDeliveryDate: deliveryDateSchema,
  note: optionalText(1000),
});

function ConfirmDateForm(props: MoveProps) {
  const { send, message } = useMove(props);
  const form = useForm<z.input<typeof dateSchema>, unknown, z.output<typeof dateSchema>>({
    resolver: zodResolver(dateSchema),
    defaultValues: { confirmedDeliveryDate: props.project.confirmedDeliveryDate ?? '', note: '' },
  });
  const submit = async (values: z.output<typeof dateSchema>) => {
    const result = await send(values);
    if (!result.ok) {
      applyServerFieldErrors(form.setError, result.error, ['confirmedDeliveryDate', 'note']);
    }
  };
  const { errors } = form.formState;

  return (
    <form
      noValidate
      onSubmit={(event) => void form.handleSubmit(submit)(event)}
      className="grid gap-4"
    >
      <TextField
        type="date"
        label="Delivery date"
        required
        min={todayInIndia()}
        hint="The date you'll confirm with the customer. Delivery targets are not guarantees, so choose a date you can keep."
        error={errors.confirmedDeliveryDate?.message}
        {...form.register('confirmedDeliveryDate')}
      />
      <TextAreaField
        label="Note for the customer (optional)"
        rows={3}
        error={errors.note?.message}
        {...form.register('note')}
      />
      <MoveFooter to={props.change.to} working={form.formState.isSubmitting} message={message} />
    </form>
  );
}

// ---------- Sending a quote

/** Rupees as typed ("15000" or "15000.50") become paise, then get the same checks as the server's. */
const priceField = z
  .string()
  .trim()
  .regex(/^\d{1,9}(\.\d{1,2})?$/, 'Enter the price in rupees, for example 15000')
  .transform((value) => Math.round(Number(value) * 100))
  .pipe(quoteInputSchema.shape.amountPaise);

const roundsField = z
  .string()
  .trim()
  .regex(/^\d+$/, 'Enter the number of rounds of changes included, for example 2')
  .transform(Number)
  .pipe(quoteInputSchema.shape.revisionsIncluded);

const quoteSchema = z.object({
  price: priceField,
  scope: quoteInputSchema.shape.scope,
  revisionsIncluded: roundsField,
  note: optionalText(1000),
});

function SendQuoteForm(props: MoveProps) {
  const { send, message } = useMove(props);
  // A quote that is sent again starts from the last one, so only what changed needs editing.
  const last = props.project.quotes.at(-1);
  const form = useForm<z.input<typeof quoteSchema>, unknown, z.output<typeof quoteSchema>>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      price: last ? String(last.amountPaise / 100) : '',
      scope: last?.scope ?? '',
      revisionsIncluded: last ? String(last.revisionsIncluded) : '',
      note: '',
    },
  });
  const submit = async (values: z.output<typeof quoteSchema>) => {
    const result = await send({
      note: values.note,
      quote: {
        amountPaise: values.price,
        scope: values.scope,
        revisionsIncluded: values.revisionsIncluded,
      },
    });
    if (!result.ok) applyServerFieldErrors(form.setError, result.error, ['note']);
  };
  const { errors } = form.formState;

  return (
    <form
      noValidate
      onSubmit={(event) => void form.handleSubmit(submit)(event)}
      className="grid gap-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Price (₹)"
          required
          inputMode="decimal"
          autoComplete="off"
          hint="In rupees, for example 15000."
          error={errors.price?.message}
          {...form.register('price')}
        />
        <TextField
          label="Rounds of changes included"
          required
          inputMode="numeric"
          autoComplete="off"
          hint="How many times they can ask for changes without paying extra."
          error={errors.revisionsIncluded?.message}
          {...form.register('revisionsIncluded')}
        />
      </div>
      <TextAreaField
        label="What the price includes"
        required
        rows={5}
        hint="The pages, features and services covered, and anything left out. The customer reads this before accepting."
        error={errors.scope?.message}
        {...form.register('scope')}
      />
      <TextAreaField
        label="Message to go with the quote (optional)"
        rows={3}
        error={errors.note?.message}
        {...form.register('note')}
      />
      <MoveFooter to={props.change.to} working={form.formState.isSubmitting} message={message} />
    </form>
  );
}
