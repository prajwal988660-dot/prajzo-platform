import { savedDesignResponseSchema, type DefinedTemplate } from '@prajzo/shared';
import { CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Alert } from '../../components/ui/Alert';
import { Button, ButtonLink } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { Spinner } from '../../components/ui/Spinner';
import { apiRequest } from '../../lib/api';
import { submitErrorMessage } from '../../lib/form-errors';
import { useAuth } from '../auth/auth-context';
import { clearDraft } from './drafts';
import { sectionNames } from './steps';
import type { Builder } from './use-builder';

/** Where a problem is, in words: "Hero (top of the page)", "Your site", "Design". */
function placeOf(path: string, builder: Builder): string {
  const section = /^pages\.0\.sections\.(\d+)/.exec(path);
  if (section) {
    const type = builder.config.pages[0]?.sections[Number(section[1])]?.type;
    return type ? `Content: ${sectionNames[type]}` : 'Content';
  }
  if (path.startsWith('design')) return 'Design';
  if (path.startsWith('pages')) return 'Sections';
  return 'Your site';
}

/**
 * Saving (Phase 9). Customers save to their account, under a name; anyone else keeps a draft in
 * this browser and is offered an account to keep it. Nothing is saved while the design breaks a
 * rule; each problem is listed with where it is.
 */
export function SaveStep({
  builder,
  template,
  design,
  onSaved,
}: {
  builder: Builder;
  template: DefinedTemplate;
  /** The saved design being edited, if it has been saved before. */
  design: { id: string; name: string } | null;
  onSaved: (design: { id: string; name: string }) => void;
}) {
  const { status, user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(design?.name ?? `${builder.config.site.name} website`);
  const [outcome, setOutcome] = useState<
    { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved' } | { kind: 'failed'; message: string }
  >({ kind: 'idle' });
  const back = design ? `/build/${design.id}` : `/build?template=${template.key}`;

  if (status === 'loading') return <Spinner label="Checking your account" />;

  if (!user) {
    return (
      <div className="grid gap-4">
        <h2 className="text-xl font-semibold">Save your design</h2>
        <p className="text-slate-600">
          Your design is kept in this browser while you work, so it is still here if you come back
          on this computer. To keep it safely, open it anywhere and send it to us later, create a
          free account. Your design comes with you.
        </p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink to={`/register?next=${encodeURIComponent(back)}`}>
            Create a free account
          </ButtonLink>
          <ButtonLink to={`/login?next=${encodeURIComponent(back)}`} variant="secondary">
            Sign in
          </ButtonLink>
        </div>
      </div>
    );
  }
  if (user.role !== 'customer') {
    return (
      <Alert tone="info" title="Saving is for customer accounts">
        You are signed in as an administrator. You can try the builder, but designs are saved by
        customers.
      </Alert>
    );
  }

  const save = async () => {
    setOutcome({ kind: 'saving' });
    try {
      const body = { name, config: builder.config };
      const { design: saved } = await apiRequest(
        design ? `/v1/designs/${encodeURIComponent(design.id)}` : '/v1/designs',
        savedDesignResponseSchema,
        { method: design ? 'PATCH' : 'POST', body: JSON.stringify(body) },
      );
      builder.markSaved(saved.config);
      clearDraft(template.key);
      setOutcome({ kind: 'saved' });
      onSaved({ id: saved.id, name: saved.name });
      if (!design) void navigate(`/build/${saved.id}`, { replace: true });
    } catch (error) {
      setOutcome({
        kind: 'failed',
        message: submitErrorMessage(error, 'Something went wrong. Please try again.'),
      });
    }
  };

  const { issues } = builder;
  return (
    <div className="grid gap-4">
      <h2 className="text-xl font-semibold">Save your design</h2>
      <TextField
        label="Name of this design"
        value={name}
        hint="Only you see it, in your saved designs."
        onChange={(event) => setName(event.target.value)}
      />
      {issues.length ? (
        <Alert
          tone="error"
          title={`${String(issues.length)} thing${issues.length === 1 ? '' : 's'} to fix before saving`}
        >
          <ul className="mt-1 grid gap-1">
            {issues.slice(0, 8).map((issue) => (
              <li key={issue.path}>
                <span className="font-semibold">{placeOf(issue.path, builder)}:</span>{' '}
                {issue.message}
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={() => void save()}
          loading={outcome.kind === 'saving'}
          disabled={issues.length > 0 || name.trim() === ''}
        >
          {outcome.kind === 'saving' ? 'Saving…' : design ? 'Save changes' : 'Save to my account'}
        </Button>
        <ButtonLink to="/account/designs" variant="ghost">
          My saved designs
        </ButtonLink>
      </div>
      {outcome.kind === 'saved' && !builder.unsaved ? (
        <p role="status" className="flex items-center gap-2 text-sm font-medium text-emerald-800">
          <CheckCircle2 aria-hidden="true" className="size-4" />
          Saved to your account.
        </p>
      ) : null}
      {outcome.kind === 'failed' ? (
        <Alert tone="error" title="This wasn't saved">
          {outcome.message}
        </Alert>
      ) : null}
    </div>
  );
}
