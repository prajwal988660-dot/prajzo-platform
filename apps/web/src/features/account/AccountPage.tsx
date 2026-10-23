import { FolderKanban, LayoutTemplate } from 'lucide-react';
import { Container } from '../../components/layout/Container';
import { ButtonLink } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { useNoIndex } from '../../lib/use-no-index';
import { usePageTitle } from '../../lib/use-page-title';
import { useAuth } from '../auth/auth-context';
import { PageIntro } from '../marketing/components/PageIntro';
import { ChangePasswordForm } from './ChangePasswordForm';
import { ProfileForm } from './ProfileForm';

/**
 * The customer's account page. Its two lists are empty for now: saved designs arrive with the
 * website builder, and projects with project requests. They say so plainly instead of showing
 * pretend items.
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
        <p>This is your space: your details, and soon your saved designs and projects.</p>
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
              description="The website builder is on its way. Designs you create there will be kept here."
            />
          </section>
          <section aria-labelledby="projects-heading">
            <h2 id="projects-heading" className="text-xl font-semibold tracking-tight">
              Your projects
            </h2>
            <EmptyState
              className="mt-4"
              icon={FolderKanban}
              title="No projects yet"
              description="Tell us about your idea and we'll reply with a quote. Your projects will appear here."
              action={<ButtonLink to="/contact">Start a project</ButtonLink>}
            />
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
