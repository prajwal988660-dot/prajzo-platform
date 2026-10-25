import { zodResolver } from '@hookform/resolvers/zod';
import { revisionMessageSchema, type ProjectDetail } from '@prajzo/shared';
import { Check, Send } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { TextAreaField } from '../../components/ui/Field';
import { formatDateTime } from '../../lib/format';
import { useProjectAction, type Notice } from './use-project-action';

const changesSchema = z.object({ message: revisionMessageSchema });
type ChangesValues = z.input<typeof changesSchema>;

/**
 * When the finished project is ready for the customer: any note from Prajzo, how many rounds of
 * changes the quote included and how many were used, and two choices: "looks good", or ask for
 * changes. Prajzo completes the project; saying it looks good only tells them.
 */
export function ReviewProject({
  project,
  onDone,
  onOutOfDate,
}: {
  project: ProjectDetail;
  onDone: (project: ProjectDetail, notice: Notice) => void;
  onOutOfDate: (message: string) => void;
}) {
  const [asking, setAsking] = useState(false);
  const readyEntry = project.timeline
    .filter((entry) => entry.kind === 'status' && entry.to === 'awaiting-review')
    .at(-1);
  const signedOff = project.timeline.find(
    (entry) => entry.kind === 'sign-off' && (!readyEntry || entry.at >= readyEntry.at),
  );
  const canSignOff = project.allowedActions.includes('sign-off');
  const canRequest = project.allowedActions.includes('request-revision');
  const revisions = project.revisions;
  const usedUp = revisions ? revisions.used >= revisions.included : false;

  const form = useForm<ChangesValues>({
    resolver: zodResolver(changesSchema),
    defaultValues: { message: '' },
  });
  const { state, run } = useProjectAction(project.reference, onDone, onOutOfDate);
  const working = state.kind === 'working';

  const askForChanges = async ({ message }: z.output<typeof changesSchema>) => {
    await run(
      { action: 'request-revision', message },
      {
        title: 'Your request for changes was sent',
        text: "Thank you. We'll make the changes and ask you to look again.",
      },
    );
  };

  return (
    <section aria-labelledby="review-heading">
      <h2 id="review-heading" className="text-xl font-semibold tracking-tight">
        Your project is ready for you to review
      </h2>
      <Card className="mt-4 grid gap-4 border-amber-200 bg-amber-50/40">
        {readyEntry?.kind === 'status' && readyEntry.note && (
          <div>
            <p className="text-sm font-medium text-slate-600">A note from Prajzo</p>
            <p className="mt-1 whitespace-pre-line text-ink">{readyEntry.note}</p>
          </div>
        )}
        {revisions && (
          <p className="text-sm text-slate-700">
            Rounds of changes used:{' '}
            <strong className="text-ink">
              {revisions.used} of {revisions.included}
            </strong>{' '}
            included in your quote.
            {usedUp && (
              <span className="mt-1 block">
                Further changes may be quoted separately. We&apos;ll tell you the cost before we
                start them.
              </span>
            )}
          </p>
        )}

        {signedOff && (
          <Alert tone="success" title="You told us it looks good">
            You said so on {formatDateTime(signedOff.at)}. We&apos;ll complete your project shortly.
            If you change your mind, you can still ask for changes below.
          </Alert>
        )}

        {!asking ? (
          <div className="flex flex-wrap gap-3">
            {canSignOff && (
              <Button
                loading={working}
                onClick={() =>
                  void run(
                    { action: 'sign-off' },
                    { title: 'Thank you', text: "We've noted that your project looks good." },
                  )
                }
              >
                <Check aria-hidden="true" className="size-4" />
                {working ? 'Sending…' : 'It looks good'}
              </Button>
            )}
            {canRequest && (
              <Button variant="secondary" onClick={() => setAsking(true)}>
                Ask for changes
              </Button>
            )}
          </div>
        ) : (
          <form
            noValidate
            onSubmit={(event) => void form.handleSubmit(askForChanges)(event)}
            className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4"
          >
            <TextAreaField
              label="What would you like changed?"
              required
              rows={4}
              hint="Be as specific as you can. One request can include several changes."
              error={form.formState.errors.message?.message}
              {...form.register('message')}
            />
            {state.kind === 'failed' && (
              <Alert tone="error" title="Your request wasn't sent">
                {state.message}
              </Alert>
            )}
            <div className="flex flex-wrap gap-3">
              <Button type="submit" loading={form.formState.isSubmitting}>
                <Send aria-hidden="true" className="size-4" />
                {form.formState.isSubmitting ? 'Sending…' : 'Send change request'}
              </Button>
              <Button
                variant="ghost"
                disabled={form.formState.isSubmitting}
                onClick={() => setAsking(false)}
              >
                Not now
              </Button>
            </div>
          </form>
        )}
        {state.kind === 'failed' && !asking && (
          <Alert tone="error" title="That didn't work">
            {state.message}
          </Alert>
        )}
      </Card>
    </section>
  );
}
