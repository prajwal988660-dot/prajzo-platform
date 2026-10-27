/**
 * Changes settings in an env file's text (apps/api/.env) and leaves every other line, comment
 * and blank line as it was. Used by setup scripts, so nobody has to edit the file by hand.
 */

/** Quotes a value so Node's env-file reader gives it back exactly. */
export function quoteEnvValue(value: string): string {
  if (/[\r\n]/.test(value)) throw new Error('A setting cannot contain a line break.');
  if (!value.includes("'")) return `'${value}'`;
  if (!value.includes('"') && !value.includes('\\')) return `"${value}"`;
  throw new Error(
    'A value with both kinds of quote mark (and a backslash) cannot be saved; choose another.',
  );
}

export function setEnvValues(content: string, values: Record<string, string>): string {
  const remaining = new Map(Object.entries(values));
  const newline = content.includes('\r\n') ? '\r\n' : '\n';
  const lines = content === '' ? [] : content.split(/\r?\n/);
  const updated = lines.map((line) => {
    const name = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line)?.[1];
    if (!name || !remaining.has(name)) return line;
    const value = remaining.get(name) ?? '';
    remaining.delete(name);
    return `${name}=${quoteEnvValue(value)}`;
  });
  if (updated.length && updated[updated.length - 1] === '') updated.pop();
  for (const [name, value] of remaining) updated.push(`${name}=${quoteEnvValue(value)}`);
  return updated.join(newline) + newline;
}
