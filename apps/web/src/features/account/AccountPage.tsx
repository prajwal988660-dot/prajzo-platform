import { projectListSchema, savedDesignListSchema } from '@prajzo/shared';
import { FolderKanban, LayoutTemplate } from 'lucide-react';
import { Link } from 'react-router';
import { Container } from '../../components/layout/Container';
import { ButtonLink } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadError, LoadingBlock } from '../../components/ui/LoadStates';
import { useApi } from '../../lib/use-api';
import { useNoIndex } from '../../lib/use-no-index';
import { usePageTitle } from '../../lib/use-page-title';
import { useAuth } from '../auth/auth-context';
import { PageIntro } from '../marketing/components/PageIntro';
import { ProjectListItem } from '../projects/ProjectListItem';
import { ChangePasswordForm } from './ChangePasswordForm';
import { ProfileForm } from './ProfileForm';

/**
 * The customer's account page: their latest saved designs and projects, and their details.
 */
export function AccountPage() {
  usePageTitle('My account');
  useNoIndex();
  const { user } = useAuth();
  if (!user) return null; // the page guard never shows this page without a customer

  const firstName = user.name.split(' ')[0] ?? user.name;

  return (
    <>
      <PageIntro eyebrow="My account" title={`Welcome, ${firstName}`}>
        <p>This is your space: your saved designs, your projects and your details.</p>
      </PageIntro>

      <Container className="grid gap-12 py-14 sm:py-16">
        <div className="grid gap-6 md:grid-cols-2">
          <section aria-labelledby="designs-heading">
            <h2 id="designs-heading" className="text-xl font-semibold tracking-tight">
              Saved designs
            </h2>
            <RecentDesigns />
          </section>
          <section aria-labelledby="projects-heading">
            <h2 id="projects-heading" className="text-xl font-semibold tracking-tight">
              Your projects
            </h2>
            <RecentProjects />
          </section>
        </div>

        <section aria-labelledby="details-heading" className="grid max-w-3xl gap-8">
          <h2 id="details-heading" className="text-xl font-semibold tracking-tight">
            Account details
          </h2>
          <ProfileForm user={user} />
          <div className="border-t border-slate-200 pt-8">
            <h3 className="text-lg font-semibold">Change your password</h3>
            <p className="mb-5 mt-1 text-sm text-slate-600">
              You&apos;ll stay signed in here. Your other devices will be signed out.
            </p>
            <ChangePasswordForm />
          </div>
        </section>
      </Container>
    </>
  );
}

/** The latest few saved designs, with a way to see them all or to start one. */
function RecentDesigns() {
  const designs = useApi('/v1/designs', savedDesignListSchema);
  if (designs.status === 'loading') return <LoadingBlock label="Loading your designs" />;
  if (designs.status === 'error') {
    return <LoadError message={designs.error.message} onRetry={designs.retry} />;
  }
  if (designs.data.items.length === 0) {
    return (
      <EmptyState
        className="mt-4"
        icon={LayoutTemplate}
        title="No saved designs yet"
        description="Start from a template, make it yours in the website builder, and save it here."
        action={<ButtonLink to="/build">Build your website</ButtonLink>}
      />
    );
  }
  return (
    <div className="mt-4 grid gap-3">
      <ul className="grid gap-2">
        {designs.data.items.slice(0, 3).map((design) => (
          <li key={design.id}>
            <Link
              to={`/build/${design.id}`}
              className="block rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-brand-indigo"
            >
              <span className="font-semibold text-ink">{design.name}</span>
              <span className="block text-sm text-slate-600">{design.templateName} template</span>
            </Link>
          </li>
        ))}
      </ul>
      <ButtonLink to="/account/designs" variant="secondary" className="justify-self-start">
        All my designs
      </ButtonLink>
    </div>
  );
}

/** The latest few projects, with a way to see them all or to start another. */
function RecentProjects() {
  const projects = useApi('/v1/project-requests?limit=3', projectListSchema);

  if (projects.status === 'loading') return <LoadingBlock label="Loading your projects" />;
  if (projects.status === 'error') {
    return <LoadError message={projects.error.message} onRetry={projects.retry} className="mt-4" />;
  }
  if (projects.data.total === 0) {
    return (
      <EmptyState
        className="mt-4"
        icon={FolderKanban}
        title="No projects yet"
        description="Tell us about your idea and we'll reply with questions or a quote. Your projects will appear here."
        action={<ButtonLink to="/start-project">Start a project</ButtonLink>}
      />
    );
  }
  return (
    <div className="mt-4 grid gap-4">
      <ul className="grid gap-3">
        {projects.data.items.map((project) => (
          <ProjectListItem key={project.reference} project={project} />
        ))}
      </ul>
      <div className="flex flex-wrap gap-3">
        <ButtonLink to="/start-project">Start a project</ButtonLink>
        <ButtonLink to="/account/projects" variant="secondary">
          {projects.data.total > projects.data.items.length
            ? `See all ${projects.data.total} projects`
            : 'My projects'}
        </ButtonLink>
      </div>
    </div>
  );
}
