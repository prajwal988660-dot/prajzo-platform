import {
  designNameSchema,
  savedDesignListSchema,
  savedDesignResponseSchema,
  type SavedDesignSummary,
} from '@prajzo/shared';
import { Copy, LayoutTemplate, Pencil, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Container } from '../../components/layout/Container';
import { Alert } from '../../components/ui/Alert';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { TextField } from '../../components/ui/Field';
import { LoadError, LoadingBlock } from '../../components/ui/LoadStates';
import { apiRequest } from '../../lib/api';
import { submitErrorMessage } from '../../lib/form-errors';
import { formatDateTime } from '../../lib/format';
import { useApi } from '../../lib/use-api';
import { useNoIndex } from '../../lib/use-no-index';
import { usePageTitle } from '../../lib/use-page-title';
import { PageIntro } from '../marketing/components/PageIntro';

/** A customer's saved designs (/account/designs): open, rename, duplicate and delete them. */
export function SavedDesignsPage() {
  usePageTitle('My saved designs');
  useNoIndex();
  const designs = useApi('/v1/designs', savedDesignListSchema);

  return (
    <>
      <PageIntro eyebrow="My account" title="My saved designs">
        <p>Designs you made in the website builder. Only you can see them.</p>
      </PageIntro>
      <Container className="py-12 sm:py-16">
        {designs.status === 'loading' && <LoadingBlock label="Loading your designs" />}
        {designs.status === 'error' && (
          <LoadError message={designs.error.message} onRetry={designs.retry} />
        )}
        {designs.status === 'success' && <DesignList initial={designs.data.items} />}
      </Container>
    </>
  );
}

function DesignList({ initial }: { initial: SavedDesignSummary[] }) {
  const [items, setItems] = useState(initial);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const shownNotice = notice ? (
    <Alert tone={notice.tone} title={notice.tone === 'success' ? 'Done' : "That didn't work"}>
      {notice.text}
    </Alert>
  ) : null;

  if (items.length === 0) {
    return (
      <div className="grid gap-6">
        {shownNotice}
        <EmptyState
          icon={LayoutTemplate}
          title="No saved designs yet"
          description="Start from a template, make it yours in the builder, and save it here."
          action={<ButtonLink to="/build">Build your website</ButtonLink>}
        />
      </div>
    );
  }
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-slate-600">
          {items.length} design{items.length === 1 ? '' : 's'}
        </p>
        <ButtonLink to="/build" variant="secondary">
          Start a new design
        </ButtonLink>
      </div>
      {shownNotice}
      <ul className="grid gap-4" aria-label="Saved designs">
        {items.map((design) => (
          <DesignCard
            key={design.id}
            design={design}
            onRenamed={(renamed) =>
              setItems((list) => list.map((item) => (item.id === renamed.id ? renamed : item)))
            }
            onDuplicated={(copy) => {
              setItems((list) => [copy, ...list]);
              setNotice({ tone: 'success', text: `“${copy.name}” was made.` });
            }}
            onDeleted={(id, name) => {
              setItems((list) => list.filter((item) => item.id !== id));
              setNotice({ tone: 'success', text: `“${name}” was deleted.` });
            }}
            onFailed={(text) => setNotice({ tone: 'error', text })}
          />
        ))}
      </ul>
    </div>
  );
}

function DesignCard({
  design,
  onRenamed,
  onDuplicated,
  onDeleted,
  onFailed,
}: {
  design: SavedDesignSummary;
  onRenamed: (design: SavedDesignSummary) => void;
  onDuplicated: (design: SavedDesignSummary) => void;
  onDeleted: (id: string, name: string) => void;
  onFailed: (message: string) => void;
}) {
  const [mode, setMode] = useState<'view' | 'rename' | 'delete'>('view');
  const [name, setName] = useState(design.name);
  const [error, setError] = useState<string | undefined>();
  const [working, setWorking] = useState(false);
  const path = `/v1/designs/${encodeURIComponent(design.id)}`;
  const summaryOf = (full: SavedDesignSummary): SavedDesignSummary => ({
    id: full.id,
    name: full.name,
    templateKey: full.templateKey,
    templateName: full.templateName,
    createdAt: full.createdAt,
    updatedAt: full.updatedAt,
  });

  const run = async (action: () => Promise<void>) => {
    setWorking(true);
    try {
      await action();
    } catch (failure) {
      onFailed(submitErrorMessage(failure, 'Something went wrong. Please try again.'));
    } finally {
      setWorking(false);
    }
  };

  const rename = (event: FormEvent) => {
    event.preventDefault();
    const checked = designNameSchema.safeParse(name);
    if (!checked.success) {
      setError(checked.error.issues[0]?.message);
      return;
    }
    void run(async () => {
      const { design: saved } = await apiRequest(path, savedDesignResponseSchema, {
        method: 'PATCH',
        body: JSON.stringify({ name: checked.data }),
      });
      onRenamed(summaryOf(saved));
      setMode('view');
    });
  };

  return (
    <li>
      <Card className="grid gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">
              <Link to={`/build/${design.id}`} className="hover:underline">
                {design.name}
              </Link>
            </h2>
            <p className="text-sm text-slate-600">
              {design.templateName} template · Last saved{' '}
              <time dateTime={design.updatedAt}>{formatDateTime(design.updatedAt)}</time>
            </p>
          </div>
          <ButtonLink
            to={`/build/${design.id}`}
            size="sm"
            aria-label={`Open ${design.name} in the builder`}
          >
            Open in the builder
          </ButtonLink>
        </div>

        {mode === 'rename' ? (
          <form onSubmit={rename} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <TextField
              label="New name"
              value={name}
              error={error}
              autoFocus
              onChange={(event) => {
                setName(event.target.value);
                setError(undefined);
              }}
            />
            <div className="flex gap-2">
              <Button type="submit" size="sm" loading={working}>
                Save name
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setMode('view')}>
                Cancel
              </Button>
            </div>
          </form>
        ) : mode === 'delete' ? (
          <div role="alert" className="grid gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <p className="font-semibold text-rose-900">
              Delete “{design.name}”? This can’t be undone.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                loading={working}
                onClick={() =>
                  void run(async () => {
                    await apiRequest(path, savedDesignResponseSchema.optional(), {
                      method: 'DELETE',
                    });
                    onDeleted(design.id, design.name);
                  })
                }
              >
                Delete
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setMode('view')}>
                Keep it
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Rename ${design.name}`}
              onClick={() => setMode('rename')}
            >
              <Pencil aria-hidden="true" className="size-4" />
              Rename
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={working}
              aria-label={`Duplicate ${design.name}`}
              onClick={() =>
                void run(async () => {
                  const { design: copy } = await apiRequest(
                    `${path}/duplicate`,
                    savedDesignResponseSchema,
                    {
                      method: 'POST',
                    },
                  );
                  onDuplicated(summaryOf(copy));
                })
              }
            >
              <Copy aria-hidden="true" className="size-4" />
              Duplicate
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Delete ${design.name}`}
              onClick={() => setMode('delete')}
            >
              <Trash2 aria-hidden="true" className="size-4" />
              Delete
            </Button>
          </div>
        )}
      </Card>
    </li>
  );
}
