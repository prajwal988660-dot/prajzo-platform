import { zodResolver } from '@hookform/resolvers/zod';
import {
  adminDeliveryDateRequestSchema,
  isFinalStatus,
  todayInIndia,
  type AdminProjectDetail,
} from '@prajzo/shared';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { TextAreaField, TextField } from '../../components/ui/Field';
import { applyServerFieldErrors } from '../../lib/form-errors';
import { formatCalendarDate } from '../../lib/format';
import type { Notice } from '../projects/use-project-action';
import { useAdminProjectAction } from './use-admin-action';

type Values = z.input<typeof adminDeliveryDateRequestSchema>;
type Parsed = z.output<typeof adminDeliveryDateRequestSchema>;

/**
 * The date Prajzo has confirmed with the customer. Nothing is shown to the customer until an
 * admin sets one, and it can be changed at any stage until the project is finished.
 */
export function DeliveryDatePanel({
  project,
  onDone,
  onOutOfDate,
}: {
  project: AdminProjectDetail;
  onDone: (project: AdminProjectDetail, notice: Notice | null) => void;
  onOutOfDate: (message: string) => void;
}) {
  const confirmed = project.confirmedDeliveryDate;
  const finished = isFinalStatus(project.status);
  const { state, run } = useAdminProjectAction(project.reference, onDone, onOutOfDate);
  const form = useForm<Values, unknown, Parsed>({
    resolver: zodResolver(adminDeliveryDateRequestSchema),
    defaultValues: { date: '', note: '' },
  });
  const { errors, isSubmitting } = form.formState;

  const submit = async (values: Parsed) => {
    const result = await run('delivery-date', values, {
      title: confirmed ? 'Delivery date changed' : 'Delivery date confirmed',
      text: `The customer can see ${formatCalendarDate(values.date)} on their project page.`,
    });
    if (!result.ok) applyServerFieldErrors(form.setError, result.error, ['date', 'note']);
  };

  return (
    <section aria-labelledby="date-heading">
      <h2 id="date-heading" className="text-xl font-semibold tracking-tight">
        Delivery date
      </h2>
      <Card className="mt-4 grid gap-4">
        <p className="text-slate-700">
          {confirmed ? (
            <>
              Confirmed with the customer:{' '}
              <strong className="text-ink">{formatCalendarDate(confirmed)}</strong>
            </>
          ) : (
            'No delivery date has been confirmed. The customer sees none until you set one.'
          )}
        </p>

        {finished ? (
          <p className="text-sm text-slate-600">
            This project is finished, so its delivery date can&apos;t be changed.
          </p>
        ) : (
          <form
            noValidate
            onSubmit={(event) => void form.handleSubmit(submit)(event)}
            className="grid gap-4"
          >
            <TextField
              type="date"
              label={confirmed ? 'Change the date to' : 'Confirm a delivery date'}
              required
              min={todayInIndia()}
              hint="Delivery targets are not guarantees, so choose a date you can keep."
              error={errors.date?.message}
              {...form.register('date')}
            />
            <TextAreaField
              label="Note for the customer (optional)"
              rows={2}
              hint={confirmed ? 'For example, why the date changed.' : undefined}
              error={errors.note?.message}
              {...form.register('note')}
            />
            {state.kind === 'failed' && (
              <Alert tone="error" title="The delivery date wasn't saved">
                {state.message}
              </Alert>
            )}
            <Button type="submit" loading={isSubmitting} className="justify-self-start">
              {isSubmitting ? 'Saving…' : confirmed ? 'Change date' : 'Confirm date'}
            </Button>
          </form>
        )}
      </Card>
    </section>
  );
}
