import type { ReadinessResponse } from '@prajzo/shared';
import { ArrowRight, LayoutTemplate } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { primaryNavigation } from '../../app/navigation';
import { Container } from '../../components/layout/Container';
import { SiteHeader } from '../../components/layout/SiteHeader';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { CheckboxField, SelectField, TextAreaField, TextField } from '../../components/ui/Field';
import { SectionHeading } from '../../components/ui/SectionHeading';
import { Spinner } from '../../components/ui/Spinner';
import { getReadiness } from '../../lib/api';
import { usePageTitle } from '../../lib/use-page-title';

/**
 * Development-only page (/dev/ui) for reviewing the design system and checking that the web app
 * can reach the API. It is not linked anywhere and is not included in production builds.
 */
export function UiGalleryPage() {
  usePageTitle('UI foundation');
  return (
    <Container className="py-14">
      <div className="flex flex-wrap items-center gap-3">
        <Badge tone="warning">Development only</Badge>
        <Badge tone="neutral">Not included in production builds</Badge>
      </div>
      <SectionHeading
        as="h1"
        className="mt-5"
        title="Prajzo UI foundation"
        description="The building blocks every page will use: colours from the logo, type, buttons, form fields and feedback states."
      />

      <div className="mt-14 grid gap-16">
        <GallerySection title="API connection">
          <ApiStatus />
        </GallerySection>

        <GallerySection title="Colours">
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {swatches.map((swatch) => (
              <li
                key={swatch.name}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
              >
                <div className={`h-20 ${swatch.className}`} />
                <div className="p-3 text-sm">
                  <p className="font-semibold">{swatch.name}</p>
                  <p className="font-mono text-xs text-slate-600">{swatch.hex}</p>
                  <p className="mt-1 text-xs text-slate-600">{swatch.use}</p>
                </div>
              </li>
            ))}
          </ul>
        </GallerySection>

        <GallerySection title="Typography">
          <div className="grid gap-4">
            <p className="font-display text-5xl font-semibold tracking-tight">Sora for headings</p>
            <p className="max-w-2xl text-lg leading-8 text-slate-600">
              Inter for interface and body text. It stays clear at small sizes on every screen,
              which matters for forms, dashboards and long descriptions.
            </p>
            <p className="font-display text-4xl font-semibold tracking-tight">
              Your Idea. <span className="text-brand-gradient">Our Development.</span>
            </p>
          </div>
        </GallerySection>

        <GallerySection title="Buttons">
          <div className="grid gap-5">
            <div className="flex flex-wrap items-center gap-3">
              <Button>Primary</Button>
              <Button variant="brand">Brand</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">
                Large <ArrowRight aria-hidden="true" className="size-4" />
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button loading>Saving</Button>
              <Button variant="secondary" disabled>
                Disabled
              </Button>
              <ButtonLink to="/" variant="secondary">
                Link styled as a button
              </ButtonLink>
            </div>
          </div>
        </GallerySection>

        <GallerySection title="Form fields">
          <FieldsDemo />
        </GallerySection>

        <GallerySection title="Badges and alerts">
          <div className="grid gap-5">
            <div className="flex flex-wrap gap-2">
              <Badge>Neutral</Badge>
              <Badge tone="brand">Brand</Badge>
              <Badge tone="success">Completed</Badge>
              <Badge tone="warning">Awaiting review</Badge>
              <Badge tone="danger">Cancelled</Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Alert title="For your information">
                Delivery targets depend on scope and content readiness.
              </Alert>
              <Alert tone="success" title="Message sent">
                We&apos;ll reply within one working day.
              </Alert>
              <Alert tone="warning" title="Unsaved changes">
                Save your design before leaving this page.
              </Alert>
              <Alert tone="error" title="Couldn't send your message">
                Check your connection and try again.
              </Alert>
            </div>
          </div>
        </GallerySection>

        <GallerySection title="Cards, empty state and loading">
          <div className="grid gap-5 md:grid-cols-3">
            <Card>
              <h3 className="text-lg font-semibold">Card</h3>
              <p className="mt-2 text-sm text-slate-600">White surface, soft border and shadow.</p>
            </Card>
            <Card interactive>
              <h3 className="text-lg font-semibold">Interactive card</h3>
              <p className="mt-2 text-sm text-slate-600">Lifts on hover, for clickable items.</p>
            </Card>
            <Card className="flex items-center justify-center gap-3 text-brand-indigo">
              <Spinner label="Loading example" />
              <span className="text-sm font-medium text-slate-600">Loading state</span>
            </Card>
          </div>
          <EmptyState
            className="mt-5"
            icon={LayoutTemplate}
            title="No saved designs yet"
            description="Designs you save in the builder will appear here."
            action={<Button variant="secondary">Example action</Button>}
          />
        </GallerySection>

        <GallerySection title="Header with all planned links">
          <p className="mb-4 text-sm text-slate-600">
            Preview only. On the real site each link appears once its page is built, and until then
            these links open the 404 page. Narrow the window to see the mobile menu.
          </p>
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <SiteHeader
              items={primaryNavigation}
              callToAction={{ label: 'Start a Project', to: '/start', available: true }}
            />
            <div className="h-24 bg-surface" />
          </div>
        </GallerySection>
      </div>
    </Container>
  );
}

const swatches = [
  { name: 'Ink', className: 'bg-ink', hex: '#0A1B46', use: 'Text, primary buttons' },
  { name: 'Indigo', className: 'bg-brand-indigo', hex: '#364CDD', use: 'Accent text, links' },
  { name: 'Blue', className: 'bg-brand-blue', hex: '#0072F6', use: 'Focus rings, icons' },
  { name: 'Cyan', className: 'bg-brand-cyan', hex: '#04BBFF', use: 'Decoration' },
  { name: 'Violet', className: 'bg-brand-violet', hex: '#8B28C0', use: 'Gradients' },
  { name: 'Magenta', className: 'bg-brand-magenta', hex: '#D02BDF', use: 'Decoration only' },
  { name: 'Surface', className: 'bg-surface', hex: '#F6F8FC', use: 'Section backgrounds' },
  {
    name: 'Brand gradient',
    className: 'bg-brand-gradient',
    hex: 'cyan → magenta',
    use: 'Thin accents',
  },
];

function GallerySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`gallery-${title}`}>
      <h2
        id={`gallery-${title}`}
        className="mb-6 border-b border-slate-200 pb-3 text-xl font-semibold"
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

type ApiState =
  | { kind: 'loading' }
  | { kind: 'answered'; readiness: ReadinessResponse }
  | { kind: 'unreachable'; message: string };

function ApiStatus() {
  const [state, setState] = useState<ApiState>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const request = new AbortController();
    getReadiness(request.signal)
      .then((readiness) => setState({ kind: 'answered', readiness }))
      .catch((error: unknown) => {
        if (request.signal.aborted) return;
        setState({
          kind: 'unreachable',
          message: error instanceof Error ? error.message : String(error),
        });
      });
    return () => request.abort();
  }, [attempt]);

  const retry = () => {
    setState({ kind: 'loading' });
    setAttempt((count) => count + 1);
  };

  return (
    <Card className="flex flex-wrap items-center justify-between gap-4">
      <div className="grid gap-2">
        {state.kind === 'loading' && <Spinner label="Checking the API" />}
        {state.kind === 'answered' && state.readiness.status === 'ready' && (
          <>
            <Badge tone="success">API ready · database connected</Badge>
            <p className="text-sm text-slate-600">
              The web app reaches the API through the development proxy.
            </p>
          </>
        )}
        {state.kind === 'answered' && state.readiness.status === 'unavailable' && (
          <>
            <Badge tone="warning">API running · database not connected</Badge>
            <p className="text-sm text-slate-600">
              Add your MongoDB Atlas connection string to <code>apps/api/.env</code> (see
              docs/SETUP.md).
            </p>
          </>
        )}
        {state.kind === 'unreachable' && (
          <>
            <Badge tone="danger">API not reachable</Badge>
            <p className="text-sm text-slate-600">
              Start everything with <code>npm run dev</code>. If the API stops right away, its
              message says which setting in <code>apps/api/.env</code> needs fixing.
            </p>
          </>
        )}
      </div>
      <Button variant="secondary" size="sm" onClick={retry} disabled={state.kind === 'loading'}>
        Check again
      </Button>
    </Card>
  );
}

function FieldsDemo() {
  const [showErrors, setShowErrors] = useState(false);
  const error = (message: string) => (showErrors ? message : undefined);

  return (
    <form
      noValidate
      className="grid max-w-xl gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        setShowErrors(true);
      }}
    >
      <TextField
        label="Full name"
        name="name"
        autoComplete="name"
        required
        error={error('Enter your full name')}
      />
      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        hint="We only use this to reply to you."
        error={error('Enter an email address like name@example.com')}
      />
      <SelectField label="Website type" name="type" defaultValue="">
        <option value="" disabled>
          Choose one
        </option>
        <option>Business website</option>
        <option>Personal portfolio</option>
        <option>Online catalogue</option>
      </SelectField>
      <TextAreaField label="Project details" name="details" hint="A few sentences is enough." />
      <CheckboxField
        label="I agree to be contacted about this request"
        name="consent"
        error={error('Tick this box so we can reply to you')}
      />
      <div className="flex flex-wrap gap-3">
        <Button type="submit">Show error states</Button>
        <Button variant="ghost" onClick={() => setShowErrors(false)}>
          Clear errors
        </Button>
      </div>
    </form>
  );
}
