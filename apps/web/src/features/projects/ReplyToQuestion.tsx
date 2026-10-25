import { zodResolver } from '@hookform/resolvers/zod';
import { replyMessageSchema, type ProjectDetail } from '@prajzo/shared';
import { Send } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { TextAreaField } from '../../components/ui/Field';
import { formatDateTime } from '../../lib/format';
import { useProjectAction, type Notice } from './use-project-action';

const answerSchema = z.object({ message: replyMessageSchema });
type AnswerValues = z.input<typeof answerSchema>;

/**
 * When Prajzo has asked the customer something: the question, the answers sent so far, and a box
 * to send another. The question is the note that came with the move to "Awaiting Customer
 * Information".
 */
export function ReplyToQuestion({
  project,
  onDone,
  onOutOfDate,
}: {
  project: ProjectDetail;
  onDone: (project: ProjectDetail, notice: Notice) => void;
  onOutOfDate: (message: string) => void;
}) {
  const question = project.timeline
    .filter((entry) => entry.kind === 'status' && entry.to === 'awaiting-information')
    .at(-1);
  const answers = project.timeline.filter(
    (entry) => entry.kind === 'reply' && (!question || entry.at >= question.at),
  );
  const canReply = project.allowedActions.includes('reply');

  const form = useForm<AnswerValues>({
    resolver: zodResolver(answerSchema),
    defaultValues: { message: '' },
  });
  const { state, run } = useProjectAction(
    project.reference,
    (updated, notice) => {
      form.reset({ message: '' });
      onDone(updated, notice);
    },
    onOutOfDate,
  );

  const send = async ({ message }: z.output<typeof answerSchema>) => {
    await run(
      { action: 'reply', message },
      { title: 'Your answer was sent', text: "Thank you. We'll carry on with your review." },
    );
  };

  return (
    <section aria-labelledby="question-heading">
      <h2 id="question-heading" className="text-xl font-semibold tracking-tight">
        Prajzo needs something from you
      </h2>
      <Card className="mt-4 grid gap-4 border-amber-200 bg-amber-50/40">
        <div>
          <p className="text-sm font-medium text-slate-600">Our question</p>
          <p className="mt-1 whitespace-pre-line text-ink">
            {question?.kind === 'status' && question.note
              ? question.note
              : 'We need a little more information to carry on with your review.'}
          </p>
        </div>

        {answers.length > 0 && (
          <div>
            <p className="text-sm font-medium text-slate-600">Your answers so far</p>
            <ul className="mt-2 grid gap-3">
              {answers.map((answer) =>
                answer.kind === 'reply' ? (
                  <li
                    key={answer.at}
                    className="rounded-xl bg-white p-3 text-sm text-slate-800 ring-1 ring-slate-200"
                  >
                    <span className="whitespace-pre-line">{answer.text}</span>
                    <span className="mt-1 block text-xs text-slate-600">
                      {formatDateTime(answer.at)}
                    </span>
                  </li>
                ) : null,
              )}
            </ul>
            <p className="mt-2 text-sm text-slate-600">
              We&apos;ve got your answer and will pick it up soon.
            </p>
          </div>
        )}

        {canReply && (
          <form
            noValidate
            onSubmit={(event) => void form.handleSubmit(send)(event)}
            className="grid gap-4"
          >
            <TextAreaField
              label={answers.length > 0 ? 'Add something more' : 'Your answer'}
              required
              rows={4}
              error={form.formState.errors.message?.message}
              {...form.register('message')}
            />
            {state.kind === 'failed' && (
              <Alert tone="error" title="Your answer wasn't sent">
                {state.message}
              </Alert>
            )}
            <Button
              type="submit"
              loading={form.formState.isSubmitting}
              className="justify-self-start"
            >
              <Send aria-hidden="true" className="size-4" />
              {form.formState.isSubmitting ? 'Sending…' : 'Send answer'}
            </Button>
          </form>
        )}
      </Card>
    </section>
  );
}
