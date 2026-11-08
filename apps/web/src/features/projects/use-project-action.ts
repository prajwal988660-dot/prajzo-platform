import {
  projectResponseSchema,
  type ProjectActionFormValues,
  type ProjectDetail,
} from '@prajzo/shared';
import { useCallback, useState } from 'react';
import { ApiError, apiRequest } from '../../lib/api';
import { submitErrorMessage } from '../../lib/form-errors';

/** What to tell the customer once something they did has worked. */
export type Notice = { title: string; text?: string; tone?: 'success' | 'warning' };

export type ActionState =
  { kind: 'idle' } | { kind: 'working' } | { kind: 'failed'; message: string };

/**
 * Sends one of the things a customer can do to a project (accept a quote, answer a question…).
 * It never claims success the server did not give: a refusal is shown with the server's own
 * words, and if the project turned out to have changed, the page loads it again.
 */
export function useProjectAction(
  reference: string,
  onDone: (project: ProjectDetail, notice: Notice) => void,
  onOutOfDate: (message: string) => void,
) {
  const [state, setState] = useState<ActionState>({ kind: 'idle' });

  const run = useCallback(
    async (body: ProjectActionFormValues, notice: Notice): Promise<boolean> => {
      setState({ kind: 'working' });
      try {
        const { project } = await apiRequest(
          `/v1/project-requests/${encodeURIComponent(reference)}/actions`,
          projectResponseSchema,
          { method: 'POST', body: JSON.stringify(body) },
        );
        setState({ kind: 'idle' });
        onDone(project, notice);
        return true;
      } catch (error) {
        // Someone may have moved the project on while this page was open: show how it is now,
        // and say why the click did nothing. That explanation belongs to the page, which keeps it
        // and moves focus to it, so this panel does not repeat it.
        if (error instanceof ApiError && error.status === 409) {
          setState({ kind: 'idle' });
          onOutOfDate(error.message);
          return false;
        }
        setState({
          kind: 'failed',
          message: submitErrorMessage(error, 'Something went wrong. Please try again.'),
        });
        return false;
      }
    },
    [reference, onDone, onOutOfDate],
  );

  const reset = useCallback(() => setState({ kind: 'idle' }), []);
  return { state, run, reset };
}
