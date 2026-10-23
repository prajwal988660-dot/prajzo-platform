import { projectListSchema } from '@prajzo/shared';
import { FolderKanban, LayoutTemplate } from 'lucide-react';
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
 * The customer's account page: their latest projects, and their details. Saved designs arrive
 * with the website builder, so that list says so plainly instead of showing pretend items.
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
        <p>
          This is your space: your projects and your details. Saved designs will appear here once
          the website builder is ready.
        </p>
      </PageIntro>

      <Container className="grid gap-12 py-14 sm:py-16">
        <div className="grid gap-6 md:grid-cols-2">
          <section aria-labelledby="designs-heading">
            <h2 id="designs-heading" className="text-xl font-semibold tracking-tight">
              Saved designs
            </h2>
            <EmptyState
              className="mt-4"
              icon={LayoutTemplate}
              title="No saved designs yet"
              description="The website builder isn't ready yet. Designs you create there will be kept here."
            />
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
