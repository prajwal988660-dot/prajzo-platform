/**
 * Right-click and image-drag blocking (D-037).
 *
 * This is a speed bump against casual copying, not a lock: anyone can still open the browser's
 * developer tools, use "View source" or save the page, because the browser must receive the page's
 * code to draw it. What really protects the code is the staging password, the minified production
 * build, and the Terms.
 *
 * Text can still be selected and copied, and form fields keep the browser's own menu (paste,
 * spelling suggestions), so nothing a visitor needs to fill in a form is taken away.
 */

/** Places where the browser's own menu must keep working. */
const editableElements =
  'input, textarea, select, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]';

/**
 * Whether the blocking should be on: on in production builds, off in development (so you can
 * inspect the page), and `VITE_PROTECT_CONTENT=true` or `=false` forces either.
 */
export function protectionEnabled(env: {
  PROD: boolean;
  VITE_PROTECT_CONTENT?: string | undefined;
}): boolean {
  if (env.VITE_PROTECT_CONTENT === 'true') return true;
  if (env.VITE_PROTECT_CONTENT === 'false') return false;
  return env.PROD;
}

/** Turns the blocking on for a document. Returns a function that turns it off again. */
export function installContentProtection(target: Document): () => void {
  const blockContextMenu = (event: MouseEvent) => {
    if (event.target instanceof Element && event.target.closest(editableElements)) return;
    event.preventDefault();
  };
  const blockImageDrag = (event: DragEvent) => {
    if (event.target instanceof HTMLImageElement) event.preventDefault();
  };

  target.addEventListener('contextmenu', blockContextMenu);
  target.addEventListener('dragstart', blockImageDrag);
  return () => {
    target.removeEventListener('contextmenu', blockContextMenu);
    target.removeEventListener('dragstart', blockImageDrag);
  };
}
