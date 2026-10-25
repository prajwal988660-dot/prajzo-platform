import { zodResolver } from '@hookform/resolvers/zod';
import { adminNoteRequestSchema, type AdminProjectDetail } from '@prajzo/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { TextAreaField } from '../../components/ui/Field';
import { applyServerFieldErrors } from '../../lib/form-errors';
import { formatDateTime } from '../../lib/format';
import type { Notice } from '../projects/use-project-action';
import { useAdminProjectAction } from './use-admin-action';

type Values = z.input<typeof adminNoteRequestSchema>;

/** Notes between admins about a project. Customers never see them, in the page or in emails. */
export function InternalNotes({
  project,
  onDone,
  onOutOfDate,
}: {
  project: AdminProjectDetail;
  onDone: (project: AdminProjectDetail, notice: Notice | null) => void;
  onOutOfDate: (message: string) => void;
}) {
  const [added, setAdded] = useState(false);
  const form = useForm<Values, unknown, z.output<typeof adminNoteRequestSchema>>({
    resolver: zodResolver(adminNoteRequestSchema),
    defaultValues: { text: '' },
  });
  const { state, run } = useAdminProjectAction(
    project.reference,
    (updated) => {
      form.reset({ text: '' });
      setAdded(true);
      // No banner at the top of the page: the confirmation stays next to the note box.
      onDone(updated, null);
    },
    onOutOfDate,
  );
  const { errors, isSubmitting } = form.formState;
  const notes = [...project.adminNotes].reverse();

  const submit = async ({ text }: z.output<typeof adminNoteRequestSchema>) => {
    setAdded(false);
    const result = await run('notes', { text }, null);
    if (!result.ok) applyServerFieldErrors(form.setError, result.error, ['text']);
  };

  return (
    <section aria-labelledby="notes-heading">
      <h2 id="notes-heading" className="text-xl font-semibold tracking-tight">
        Internal notes
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Only admins can see these. The customer never does.
      </p>
      <Card className="mt-4 grid gap-5">
        {notes.length === 0 ? (
          <p className="text-slate-600">No notes yet.</p>
        ) : (
          <ul className="grid gap-3">
            {notes.map((note) => (
              <li key={note.id} className="rounded-xl bg-surface p-4 text-sm">
                <p className="whitespace-pre-line text-ink">{note.text}</p>
                <p className="mt-2 text-xs text-slate-600">
                  {note.byName} · <time dateTime={note.at}>{formatDateTime(note.at)}</time>
                </p>
              </li>
            ))}
          </ul>
        )}

        <form
          noValidate
          onSubmit={(event) => void form.handleSubmit(submit)(event)}
          className="grid gap-4"
        >
          <TextAreaField
            label="Add a note"
            required
            rows={3}
            error={errors.text?.message}
            {...form.register('text', { onChange: () => setAdded(false) })}
          />
          {state.kind === 'failed' && (
            <Alert tone="error" title="The note wasn't saved">
              {state.message}
            </Alert>
          )}
          <div className="flex flex-wrap items-center gap-4">
            <Button type="submit" loading={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Add note'}
            </Button>
            {added && (
              <p role="status" className="text-sm font-medium text-emerald-800">
                Note added.
              </p>
            )}
          </div>
        </form>
      </Card>
    </section>
  );
}
