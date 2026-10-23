import { Spinner } from '../components/ui/Spinner';

/** Shown while the first page's code is still downloading (instead of a blank screen). */
export function StartupScreen() {
  return (
    <div className="grid min-h-dvh place-items-center text-brand-indigo">
      <Spinner label="Loading Prajzo" size="lg" />
    </div>
  );
}
