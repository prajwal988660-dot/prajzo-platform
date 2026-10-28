/** First focusable element on every page: lets keyboard users jump past the header. */
export function SkipLink({ target = 'main' }: { target?: string }) {
  return (
    <a
      href={`#${target}`}
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-white"
    >
      Skip to main content
    </a>
  );
}
