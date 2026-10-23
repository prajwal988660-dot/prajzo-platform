/**
 * After signing in, people go back to the page they were trying to open (`/login?next=/account`).
 * That address comes from the URL, so it is checked: only a path on this same website is
 * accepted. Anything else (another website, `//evil.example`, `javascript:`…) is ignored, so a
 * crafted link can't send someone somewhere else after they sign in.
 */
export function safeNextPath(raw: string | null | undefined, fallback: string): string {
  if (!raw) return fallback;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f\\]/.test(raw)) return fallback;
  if (!raw.startsWith('/') || raw.startsWith('//')) return fallback;
  try {
    const url = new URL(raw, 'https://placeholder.invalid');
    if (url.origin !== 'https://placeholder.invalid') return fallback;
    // Never bounce between the sign-in pages themselves.
    if (/^\/(login|register|forgot-password|admin\/login)(\/|$)/.test(url.pathname))
      return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
