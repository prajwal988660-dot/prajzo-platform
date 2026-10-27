/**
 * Changes parts of a MongoDB connection string (the password, the database name) without
 * touching the rest. A plain URL parser can't be used: a standard (non-SRV) address lists
 * several hosts separated by commas, which URL rejects.
 */

const pattern =
  /^(?<scheme>mongodb(?:\+srv)?:\/\/)(?:(?<user>[^:@/]+)(?::(?<password>[^@/]*))?@)?(?<hosts>[^/?]+)(?:\/(?<database>[^?]*))?(?<query>\?.*)?$/;

function parts(uri: string) {
  const match = pattern.exec(uri.trim());
  if (!match?.groups) throw new Error('This is not a MongoDB connection string.');
  const { scheme = '', user, password, hosts = '', database = '', query = '' } = match.groups;
  return { scheme, user, password, hosts, database, query };
}

function build(p: ReturnType<typeof parts>): string {
  const credentials = p.user ? `${p.user}${p.password === undefined ? '' : `:${p.password}`}@` : '';
  return `${p.scheme}${credentials}${p.hosts}/${p.database}${p.query}`;
}

/** The database the string names, such as "prajzo" (empty if it names none). */
export function databaseOf(uri: string): string {
  return decodeURIComponent(parts(uri).database);
}

/** The same address with another database name. */
export function withDatabase(uri: string, database: string): string {
  if (!/^[A-Za-z0-9_-]{1,38}$/.test(database)) {
    throw new Error('A database name may use letters, digits, - and _ only.');
  }
  return build({ ...parts(uri), database });
}

/** The same address with another password (encoded, so any character is safe). */
export function withPassword(uri: string, password: string): string {
  const current = parts(uri);
  if (!current.user) throw new Error('This connection string has no user name.');
  return build({ ...current, password: encodeURIComponent(password) });
}

/** The user name in the string. */
export function userOf(uri: string): string | undefined {
  const { user } = parts(uri);
  return user === undefined ? undefined : decodeURIComponent(user);
}
