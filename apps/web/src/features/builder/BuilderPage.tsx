import {
  savedDesignResponseSchema,
  startingConfig,
  templateListResponseSchema,
  type DefinedTemplate,
  type WebsiteConfig,
} from '@prajzo/shared';
import { templateFor } from '@prajzo/shared/templates';
import { ArrowLeft, Monitor, Smartphone, Tablet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useBlocker, useParams, useSearchParams } from 'react-router';
import { Container } from '../../components/layout/Container';
import { Alert } from '../../components/ui/Alert';
import { Button, ButtonLink } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadError, LoadingBlock } from '../../components/ui/LoadStates';
import { cx } from '../../lib/cx';
import { useApi } from '../../lib/use-api';
import { useNoIndex } from '../../lib/use-no-index';
import { usePageTitle } from '../../lib/use-page-title';
import { useAuth } from '../auth/auth-context';
import { clearDraft, readDraft, writeDraft } from './drafts';
import { PreviewFrame, devices, type Device } from './PreviewFrame';
import { SaveStep } from './SaveStep';
import { ContentStep, DesignStep, SectionsStep, SiteStep } from './steps';
import { useBuilder } from './use-builder';

const steps = [
  { key: 'template', label: 'Template' },
  { key: 'site', label: 'Your site' },
  { key: 'sections', label: 'Sections' },
  { key: 'content', label: 'Content' },
  { key: 'design', label: 'Design' },
  { key: 'preview', label: 'Preview' },
  { key: 'save', label: 'Save' },
] as const;
type Step = (typeof steps)[number]['key'];

/** Step numbers leave out Preview, which is a step only on phones (elsewhere it is always shown). */
const numberOf = (key: Step): number =>
  steps.filter((item) => item.key !== 'preview').findIndex((item) => item.key === key) + 1;

/**
 * The website builder (/build, Phase 9). /build?template=portfolio starts from a template's demo
 * ("Customize This Design"); /build/:id opens a saved design. The preview shows every change at
 * once, with the same renderer as the live demos.
 */
export function BuilderPage() {
  useNoIndex();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  if (id) return <SavedDesignLoader key={id} id={id} />;
  const key = searchParams.get('template');
  const template = key ? templateFor(key) : undefined;
  if (!template) return <ChooseTemplate />;
  return <NewDesign key={template.key} template={template} />;
}

function NewDesign({ template }: { template: DefinedTemplate }) {
  // A draft from an earlier visit in this browser is picked up where it was left.
  const [initial] = useState(() => {
    const draft = readDraft(template.key);
    return { config: draft ?? startingConfig(template), restored: draft !== null };
  });
  return (
    <Workspace
      template={template}
      initial={initial.config}
      restored={initial.restored}
      design={null}
    />
  );
}

function SavedDesignLoader({ id }: { id: string }) {
  const { status, user } = useAuth();
  const result = useApi(`/v1/designs/${encodeURIComponent(id)}`, savedDesignResponseSchema);
  usePageTitle('Website builder');

  if (status !== 'loading' && !user) {
    return (
      <Container className="py-16 sm:py-24">
        <EmptyState
          title="Sign in to open your design"
          headingLevel={1}
          description="Saved designs belong to an account."
          action={
            <ButtonLink to={`/login?next=${encodeURIComponent(`/build/${id}`)}`}>
              Sign in
            </ButtonLink>
          }
        />
      </Container>
    );
  }
  if (result.status === 'loading') {
    return (
      <Container className="py-16">
        <LoadingBlock label="Opening your design" className="min-h-[60svh]" />
      </Container>
    );
  }
  if (result.status === 'error') {
    return (
      <Container className="py-16 sm:py-24">
        {result.error.status === 404 ? (
          <EmptyState
            title="We couldn't find that design"
            headingLevel={1}
            description="It may have been deleted, or it belongs to another account."
            action={<ButtonLink to="/account/designs">My saved designs</ButtonLink>}
          />
        ) : (
          <LoadError message={result.error.message} onRetry={result.retry} />
        )}
      </Container>
    );
  }
  const { design } = result.data;
  const template = templateFor(design.templateKey);
  if (!template) return null;
  return (
    <Workspace
      template={template}
      initial={design.config}
      restored={false}
      design={{ id: design.id, name: design.name }}
    />
  );
}

/** Step 1 when no template was chosen: the templates there are, by category. */
function ChooseTemplate() {
  usePageTitle('Website builder');
  const templates = useApi('/v1/templates', templateListResponseSchema);
  return (
    <Container className="py-12 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Build your website</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Start from a template. You can change its words, pictures, colours, typefaces and sections,
        and see every change as you make it.
      </p>
      <div className="mt-8">
        {templates.status === 'loading' && <LoadingBlock label="Loading templates" />}
        {templates.status === 'error' && (
          <LoadError message={templates.error.message} onRetry={templates.retry} />
        )}
        {templates.status === 'success' && (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {templates.data.items.map((template) => (
              <li
                key={template.key}
                className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-card"
              >
                <img
                  src={template.previewImage.src}
                  alt=""
                  width={960}
                  height={600}
                  className="aspect-[8/5] w-full rounded-lg border border-slate-200 object-cover object-top"
                />
                <h2 className="text-lg font-semibold">{template.name}</h2>
                <p className="text-sm text-slate-600">
                  {template.categories.map((category) => category.title).join(', ')}
                </p>
                <ButtonLink
                  to={`/build?template=${template.key}`}
                  aria-label={`Customize This Design: ${template.name}`}
                  className="justify-self-start"
                >
                  Customize This Design
                </ButtonLink>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Container>
  );
}

function Workspace({
  template,
  initial,
  restored,
  design: initialDesign,
}: {
  template: DefinedTemplate;
  initial: WebsiteConfig;
  restored: boolean;
  design: { id: string; name: string } | null;
}) {
  usePageTitle(
    initialDesign
      ? `${initialDesign.name} · Website builder`
      : `${template.name} · Website builder`,
  );
  const builder = useBuilder(template, initial);
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('content');
  const [device, setDevice] = useState<Device>('desktop');
  const [design, setDesign] = useState(initialDesign);
  const [showRestored, setShowRestored] = useState(restored);
  const customer = user?.role === 'customer';

  // Not yet saved to an account: keep the design in this browser as it changes.
  useEffect(() => {
    if (design) return;
    const timer = window.setTimeout(() => writeDraft(builder.config), 400);
    return () => window.clearTimeout(timer);
  }, [builder.config, design]);

  // A saved design with changes not saved yet: ask before leaving.
  const guard = Boolean(customer && design && builder.unsaved);
  const blocker = useBlocker(guard);
  useEffect(() => {
    if (!guard) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [guard]);

  const startOver = () => {
    clearDraft(template.key);
    builder.setConfig(startingConfig(template));
    setShowRestored(false);
  };

  const panel = (
    <>
      {step === 'template' && (
        <div className="grid gap-4">
          <h2 className="text-xl font-semibold">Template</h2>
          <p className="text-slate-600">
            You are building with the{' '}
            <span className="font-semibold text-ink">{template.name}</span> template.
          </p>
          <ButtonLink to="/build" variant="secondary" className="justify-self-start">
            See all templates
          </ButtonLink>
          <Button variant="ghost" className="justify-self-start" onClick={startOver}>
            Start again from the {template.name} demo
          </Button>
        </div>
      )}
      {step === 'site' && <SiteStep builder={builder} template={template} />}
      {step === 'sections' && <SectionsStep builder={builder} template={template} />}
      {step === 'content' && <ContentStep builder={builder} template={template} />}
      {step === 'design' && <DesignStep builder={builder} template={template} />}
      {step === 'save' && (
        <SaveStep builder={builder} template={template} design={design} onSaved={setDesign} />
      )}
    </>
  );

  return (
    <div className="min-h-svh bg-surface">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <Link
            to={customer ? '/account/designs' : '/templates'}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-indigo underline underline-offset-2"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            {customer ? 'My designs' : 'Templates'}
          </Link>
          <h1 className="min-w-0 flex-1 truncate text-base font-semibold">
            {design ? design.name : `${template.name} design`}
            <span className="ml-2 text-sm font-normal text-slate-600">
              {builder.unsaved
                ? design
                  ? '· Changes not saved'
                  : '· Draft in this browser'
                : '· Saved'}
            </span>
          </h1>
          <div className="flex gap-1" role="group" aria-label="Preview size">
            {(Object.keys(devices) as Device[]).map((key) => {
              const Icon = key === 'desktop' ? Monitor : key === 'tablet' ? Tablet : Smartphone;
              return (
                <Button
                  key={key}
                  variant={device === key ? 'primary' : 'ghost'}
                  size="sm"
                  aria-pressed={device === key}
                  onClick={() => setDevice(key)}
                >
                  <Icon aria-hidden="true" className="size-4" />
                  <span className="sr-only sm:not-sr-only">{devices[key].label}</span>
                </Button>
              );
            })}
          </div>
        </div>
        <nav aria-label="Builder steps" className="overflow-x-auto border-t border-slate-100 px-2">
          <ol className="flex min-w-max gap-1 py-2">
            {steps.map((item) => (
              <li key={item.key} className={item.key === 'preview' ? 'lg:hidden' : undefined}>
                <button
                  type="button"
                  aria-current={step === item.key ? 'step' : undefined}
                  onClick={() => setStep(item.key)}
                  className={cx(
                    'rounded-full px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-brand-blue',
                    step === item.key ? 'bg-ink text-white' : 'text-slate-700 hover:bg-slate-100',
                  )}
                >
                  {item.key === 'preview'
                    ? item.label
                    : `${String(numberOf(item.key))}. ${item.label}`}
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </header>

      {blocker.state === 'blocked' ? (
        <div
          role="alertdialog"
          aria-labelledby="leave-title"
          className="border-b border-amber-300 bg-amber-50 px-4 py-3"
        >
          <p id="leave-title" className="font-semibold text-amber-900">
            Leave without saving your changes?
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => blocker.reset()}>
              Stay and save
            </Button>
            <Button size="sm" variant="secondary" onClick={() => blocker.proceed()}>
              Leave without saving
            </Button>
          </div>
        </div>
      ) : null}

      {showRestored ? (
        <div className="px-4 pt-4">
          <Alert tone="info" title="Your draft is back">
            We kept your design in this browser from your last visit.{' '}
            <button type="button" className="font-semibold underline" onClick={startOver}>
              Start again from the demo
            </button>
          </Alert>
        </div>
      ) : null}

      <div className="grid gap-6 p-4 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]">
        <section
          aria-label="Edit your website"
          className={cx(
            'min-w-0 rounded-2xl bg-white p-5 shadow-card',
            step === 'preview' && 'hidden lg:block',
          )}
        >
          {step === 'preview' ? (
            <p className="text-sm text-slate-600">The preview is on the right.</p>
          ) : (
            panel
          )}
        </section>
        <section
          aria-label="Preview"
          className={cx(
            'min-w-0 lg:sticky lg:top-32 lg:self-start',
            step !== 'preview' && 'hidden lg:block',
          )}
        >
          <PreviewFrame config={builder.config} device={device} />
          {builder.issues.length ? (
            <p className="mt-3 text-center text-sm text-slate-600">
              {builder.issues.length} thing{builder.issues.length === 1 ? '' : 's'} to fix before
              saving (see Save). The preview shows the last version without problems.
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
