import { adminProjectResponseSchema, type AdminProjectDetail } from '@prajzo/shared';
import { useCallback, useState } from 'react';
import { ApiError, apiRequest } from '../../lib/api';
import { submitErrorMessage } from '../../lib/form-errors';
import type { Notice } from '../projects/use-project-action';

/** The three things an admin can send to a project. */
export type AdminAction = 'status' | 'delivery-date' | 'notes';

export type AdminActionState =
  { kind: 'idle' } | { kind: 'working' } | { kind: 'failed'; message: string };

/** `error` is whatever was thrown, so a form can show the server's per-field messages. */
export type AdminActionResult = { ok: true } | { ok: false; error: unknown };

/**
 * Sends a status change, a delivery date or an internal note for one project. It never claims
 * success the server did not give: a refusal is shown in the server's own words, and if the
 * project turned out to have changed under the admin, the page loads it again and says why.
 */
export function useAdminProjectAction(
  reference: string,
  onDone: (project: AdminProjectDetail, notice: Notice | null) => void,
  onOutOfDate: (message: string) => void,
) {
  const [state, setState] = useState<AdminActionState>({ kind: 'idle' });

  const run = useCallback(
    async (
      action: AdminAction,
      body: unknown,
      notice: Notice | null,
    ): Promise<AdminActionResult> => {
      setState({ kind: 'working' });
      try {
        const { project } = await apiRequest(
          `/v1/admin/project-requests/${encodeURIComponent(reference)}/${action}`,
          adminProjectResponseSchema,
          { method: 'POST', body: JSON.stringify(body) },
        );
        setState({ kind: 'idle' });
        onDone(project, notice);
        return { ok: true };
      } catch (error) {
        // Out of date: the page keeps that explanation and moves focus to it, so this panel does
        // not show the same words a second time.
        if (error instanceof ApiError && error.status === 409) {
          setState({ kind: 'idle' });
          onOutOfDate(error.message);
          return { ok: false, error };
        }
        setState({
          kind: 'failed',
          message: submitErrorMessage(error, 'Something went wrong. Please try again.'),
        });
        return { ok: false, error };
      }
    },
    [reference, onDone, onOutOfDate],
  );

  const reset = useCallback(() => setState({ kind: 'idle' }), []);
  return { state, run, reset };
}
