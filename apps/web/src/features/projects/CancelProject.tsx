import { projectResponseSchema, type ProjectDetail } from '@prajzo/shared';
import { useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { TextAreaField } from '../../components/ui/Field';
import { ApiError, apiRequest } from '../../lib/api';
import { submitErrorMessage } from '../../lib/form-errors';

type State = { kind: 'idle' } | { kind: 'working' } | { kind: 'failed'; message: string };

/**
 * Cancelling a project that is still early. It asks first, because it can't be undone, and the
 * button only exists while the server says the customer may cancel.
 */
export function CancelProject({
  reference,
  onCancelled,
  onOutOfDate,
}: {
  reference: string;
  onCancelled: (project: ProjectDetail) => void;
  /** The project changed while the page was open, so the page should load it again. */
  onOutOfDate: () => void;
}) {
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState('');
  const [state, setState] = useState<State>({ kind: 'idle' });

  const cancel = async () => {
    setState({ kind: 'working' });
    try {
      const { project } = await apiRequest(
        `/v1/project-requests/${encodeURIComponent(reference)}/actions`,
        projectResponseSchema,
        {
          method: 'POST',
          body: JSON.stringify({ action: 'cancel', note: reason.trim() || undefined }),
        },
      );
      onCancelled(project);
    } catch (error) {
      setState({
        kind: 'failed',
        message: submitErrorMessage(error, 'Something went wrong. Please try again.'),
      });
      // Someone may have moved the project on while this page was open: show how it is now.
      if (error instanceof ApiError && error.status === 409) onOutOfDate();
    }
  };

  return (
    <section aria-labelledby="cancel-heading">
      <h2 id="cancel-heading" className="text-xl font-semibold tracking-tight">
        Cancel this project
      </h2>
      <Card className="mt-4 grid gap-4">
        <p className="text-slate-600">
          Changed your mind? You can cancel while the project is still early. This can&apos;t be
          undone, but you&apos;re welcome to start a new project at any time.
        </p>

        {!asking ? (
          <Button
            variant="secondary"
            className="justify-self-start"
            onClick={() => setAsking(true)}
          >
            Cancel this project
          </Button>
        ) : (
          <div className="grid gap-4 rounded-xl border border-rose-200 bg-rose-50/50 p-4">
            <p className="font-semibold text-ink">Are you sure you want to cancel this project?</p>
            <TextAreaField
              label="Reason (optional)"
              rows={3}
              maxLength={500}
              hint="It helps us improve. You can leave it empty."
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
            {state.kind === 'failed' && (
              <Alert tone="error" title="The project wasn't cancelled">
                {state.message}
              </Alert>
            )}
            <div className="flex flex-wrap gap-3">
              <Button
                variant="primary"
                className="bg-rose-700 hover:bg-rose-800"
                loading={state.kind === 'working'}
                onClick={() => void cancel()}
              >
                {state.kind === 'working' ? 'Cancelling…' : 'Yes, cancel this project'}
              </Button>
              <Button
                variant="ghost"
                disabled={state.kind === 'working'}
                onClick={() => {
                  setAsking(false);
                  setState({ kind: 'idle' });
                }}
              >
                Keep my project
              </Button>
            </div>
          </div>
        )}
      </Card>
    </section>
  );
}
