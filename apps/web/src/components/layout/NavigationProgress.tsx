import { useNavigation } from 'react-router';

/** A thin bar at the top of the screen while the next page is loading. */
export function NavigationProgress() {
  const navigation = useNavigation();
  if (navigation.state === 'idle') return null;
  return (
    <div
      role="progressbar"
      aria-label="Loading page"
      className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-indigo-100"
    >
      <div className="h-full w-1/3 animate-[navigation-progress_1s_ease-in-out_infinite] bg-brand-gradient" />
    </div>
  );
}
