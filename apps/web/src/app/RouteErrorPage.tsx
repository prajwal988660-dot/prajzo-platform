import { RefreshCw } from 'lucide-react';
import { useEffect } from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router';
import { Container } from '../components/layout/Container';
import { Button, ButtonLink } from '../components/ui/Button';
import { NotFoundPage } from '../features/system/NotFoundPage';
import { errorReportingEnabled, reportError } from '../lib/error-reporting';
import { usePageTitle } from '../lib/use-page-title';

/** Shown when a page crashes or a route can't be loaded. */
export function RouteErrorPage() {
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;

  // The router catches the crash, so it never reaches the window's own error listener (D-058).
  useEffect(() => {
    if (!notFound && errorReportingEnabled(import.meta.env)) reportError('render', error);
  }, [error, notFound]);

  if (notFound) return <NotFoundPage />;
  return <SomethingWentWrong />;
}

function SomethingWentWrong() {
  usePageTitle('Something went wrong');
  return (
    <Container className="flex flex-col items-center py-24 text-center sm:py-32">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Something went wrong</h1>
      <p className="mt-4 max-w-md text-slate-600">
        This page ran into a problem. Reloading usually fixes it. If it keeps happening, please let
        us know.
      </p>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Button onClick={() => window.location.reload()}>
          <RefreshCw aria-hidden="true" className="size-4" />
          Reload the page
        </Button>
        <ButtonLink to="/" variant="secondary">
          Go to the home page
        </ButtonLink>
      </div>
    </Container>
  );
}
