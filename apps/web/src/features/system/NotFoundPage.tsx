import { ArrowLeft } from 'lucide-react';
import { Container } from '../../components/layout/Container';
import { ButtonLink } from '../../components/ui/Button';
import { useNoIndex } from '../../lib/use-no-index';
import { usePageTitle } from '../../lib/use-page-title';

export function NotFoundPage() {
  usePageTitle('Page not found');
  useNoIndex(); // an address that is nothing must not be listed
  return (
    <Container className="flex flex-col items-center py-24 text-center sm:py-32">
      <p
        aria-hidden="true"
        className="font-display text-7xl font-semibold tracking-tight text-brand-gradient sm:text-8xl"
      >
        404
      </p>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">Page not found</h1>
      <p className="mt-4 max-w-md text-slate-600">
        The page you&apos;re looking for doesn&apos;t exist, or it may have moved.
      </p>
      <ButtonLink to="/" className="mt-10">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to the home page
      </ButtonLink>
    </Container>
  );
}
