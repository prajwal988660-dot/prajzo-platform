import { categoryListSchema, servicePackageListSchema, type PublicUser } from '@prajzo/shared';
import { Link, useLocation, useSearchParams } from 'react-router';
import { Container } from '../../components/layout/Container';
import { Alert } from '../../components/ui/Alert';
import { Button, ButtonLink } from '../../components/ui/Button';
import { LoadError, LoadingBlock } from '../../components/ui/LoadStates';
import { usePageTitle } from '../../lib/use-page-title';
import { useApi } from '../../lib/use-api';
import { useAuth } from '../auth/auth-context';
import { PageIntro } from '../marketing/components/PageIntro';
import { StartProjectForm } from './StartProjectForm';

const steps = [
  'You tell us what you need.',
  'We read it and reply with questions, or a quote with the scope, price and delivery date.',
  "You decide. Nothing starts until you've accepted the quote.",
];

/**
 * Where a project starts. Anyone can read about it; the form is for signed-in customers, so
 * their projects are kept in their account and they can follow them.
 */
export function StartProjectPage() {
  usePageTitle('Start a Project');

  return (
    <>
      <PageIntro eyebrow="Start a project" title="Tell us about your project">
        <p>
          Describe what you need. We&apos;ll review it and reply with questions, or a quote that
          includes the scope, price and delivery date.
        </p>
      </PageIntro>

      <section className="py-14 sm:py-20">
        <Container className="grid gap-12 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-card sm:p-8">
            <ProjectArea />
          </div>

          <aside aria-labelledby="next-heading" className="grid content-start gap-8">
            <div>
              <h2 id="next-heading" className="text-xl font-semibold">
                What happens next
              </h2>
              <ol className="mt-4 grid gap-3 text-slate-700">
                {steps.map((step, index) => (
                  <li key={step} className="flex gap-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-indigo-50 text-sm font-semibold text-brand-indigo">
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <h2 className="text-xl font-semibold">Just have a question?</h2>
              <p className="mt-2 text-slate-600">
                You don&apos;t need an account to talk to us.{' '}
                <Link
                  to="/contact"
                  className="font-medium text-brand-indigo underline underline-offset-2"
                >
                  Send us a message
                </Link>
                .
              </p>
            </div>
          </aside>
        </Container>
      </section>
    </>
  );
}

/** What the card shows depends on who is looking: a visitor, a customer or an administrator. */
function ProjectArea() {
  const { status, user, retry } = useAuth();
  const location = useLocation();
  const here = location.pathname + location.search;

  // Until the server has answered, nobody is "a visitor": a signed-in customer would otherwise
  // see the sign-in prompt flash up first.
  if (status === 'loading') return <LoadingBlock label="Checking your sign-in" />;

  if (status === 'unavailable') {
    return (
      <Alert tone="warning" title="We can't check whether you're signed in right now">
        <p>Please try again in a minute, or message us on WhatsApp.</p>
        <Button variant="secondary" size="sm" className="mt-3" onClick={retry}>
          Try again
        </Button>
      </Alert>
    );
  }

  if (!user) {
    const next = encodeURIComponent(here);
    return (
      <div className="grid gap-5">
        <h2 className="text-2xl font-semibold tracking-tight">Sign in to send your project</h2>
        <p className="text-slate-600">
          A free account keeps your projects together, so you can see where each one stands, read
          your quote and reply to us. It only takes a minute, and you&apos;ll come straight back
          here.
        </p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink to={`/register?next=${next}`} size="lg">
            Create a free account
          </ButtonLink>
          <ButtonLink to={`/login?next=${next}`} variant="secondary" size="lg">
            Sign in
          </ButtonLink>
        </div>
      </div>
    );
  }

  if (user.role !== 'customer') {
    return (
      <Alert tone="info" title="You're signed in as an administrator">
        Project requests are sent from customer accounts. To try the form, sign out and use a
        customer account.
      </Alert>
    );
  }

  return <CustomerArea user={user} />;
}

function CustomerArea({ user }: { user: PublicUser }) {
  const [searchParams] = useSearchParams();
  const categories = useApi('/v1/categories', categoryListSchema);
  const packages = useApi('/v1/packages', servicePackageListSchema);

  if (categories.status === 'error' || packages.status === 'error') {
    const error = categories.error ?? packages.error;
    return (
      <LoadError
        message={error?.message ?? 'Something went wrong. Please try again.'}
        onRetry={() => {
          if (categories.status === 'error') categories.retry();
          if (packages.status === 'error') packages.retry();
        }}
      />
    );
  }
  if (categories.status === 'loading' || packages.status === 'loading') {
    return <LoadingBlock label="Loading the form" />;
  }

  return (
    <div className="grid gap-6">
      <h2 className="text-2xl font-semibold tracking-tight">Your project</h2>
      <StartProjectForm
        user={user}
        categories={categories.data.items}
        packages={packages.data.items}
        initialType={searchParams.get('type') ?? ''}
        initialPackage={searchParams.get('package') ?? ''}
      />
    </div>
  );
}
