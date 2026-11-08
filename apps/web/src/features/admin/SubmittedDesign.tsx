import { configSchemaFor, type AdminProjectDetail } from '@prajzo/shared';
import { templateFor } from '@prajzo/shared/templates';
import { useMemo, useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { SiteRenderer } from '../../site-renderer/SiteRenderer';

/**
 * The design a customer built and sent (Phase 14), drawn read-only by the same renderer as the
 * demos (`mode="review"`, so nothing can be typed or sent).
 *
 * The configuration is checked against its template's own rules before it is drawn: it was frozen
 * when it was sent, possibly under an older template version, and what came out of the database is
 * never trusted. If it no longer fits, the page says so rather than failing.
 */
export function SubmittedDesign({ design }: { design: NonNullable<AdminProjectDetail['design']> }) {
  const [shown, setShown] = useState(false);
  const template = templateFor(design.templateKey);

  const checked = useMemo(() => {
    if (!template) return null;
    const result = configSchemaFor(template).safeParse(design.config);
    return result.success ? result.data : null;
  }, [template, design.config]);

  return (
    <div className="mt-3 grid gap-3">
      <dl className="grid gap-1 text-sm">
        <div className="flex gap-2">
          <dt className="font-semibold text-slate-700">Design:</dt>
          <dd className="text-slate-600">{design.name}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-semibold text-slate-700">Template:</dt>
          <dd className="text-slate-600">
            {template?.name ?? design.templateKey} (version {design.templateVersion})
          </dd>
        </div>
      </dl>

      {!checked ? (
        <Alert tone="warning" title="This design cannot be drawn here">
          {template
            ? 'It was saved under an older version of the template and no longer fits its rules. The customer still has it; open it with them if you need to see it.'
            : `Its template (${design.templateKey}) is not one this site knows about.`}
        </Alert>
      ) : (
        <>
          <div>
            <Button variant="secondary" size="sm" onClick={() => setShown((value) => !value)}>
              {shown ? 'Hide the design' : 'Show the design'}
            </Button>
          </div>
          {shown ? (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              {/* The renderer lays out by the width of this box, so it reads like a real page. */}
              <SiteRenderer config={checked} mode="review" />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
