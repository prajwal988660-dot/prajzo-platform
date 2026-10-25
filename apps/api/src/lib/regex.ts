/** Makes text safe to use inside a regular expression, so a search for "a.b" finds "a.b" only. */
export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
