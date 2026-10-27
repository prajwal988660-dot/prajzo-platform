import { describe, expect, it } from 'vitest';
import { databaseOf, userOf, withDatabase, withPassword } from './mongodb-uri';

const standard =
  'mongodb://someone:password@ac-1-shard-00-00.abc.mongodb.net:27017,ac-1-shard-00-01.abc.mongodb.net:27017/prajzo?ssl=true&replicaSet=atlas-x&authSource=admin';
const srv = 'mongodb+srv://someone:secret@cluster0.abc.mongodb.net/?retryWrites=true';

describe('MongoDB connection strings', () => {
  it('reads the database and user, including from several hosts', () => {
    expect(databaseOf(standard)).toBe('prajzo');
    expect(databaseOf(srv)).toBe('');
    expect(userOf(standard)).toBe('someone');
  });

  it('changes only the database name', () => {
    expect(withDatabase(standard, 'prajzo-staging')).toBe(
      standard.replace('/prajzo?', '/prajzo-staging?'),
    );
    expect(withDatabase(srv, 'prajzo-live')).toBe(
      'mongodb+srv://someone:secret@cluster0.abc.mongodb.net/prajzo-live?retryWrites=true',
    );
    expect(() => withDatabase(srv, 'bad/name')).toThrow(/letters, digits/);
  });

  it('changes only the password, encoding characters that would break the address', () => {
    const changed = withPassword(standard, 'n3w:p@ss/w#rd?');
    expect(changed).toBe(standard.replace('password@', 'n3w%3Ap%40ss%2Fw%23rd%3F@'));
    expect(databaseOf(changed)).toBe('prajzo');
  });

  it('refuses anything that is not a connection string', () => {
    expect(() => databaseOf('https://example.com')).toThrow(/not a MongoDB/);
    expect(() => withPassword('mongodb://host/db', 'x')).toThrow(/no user name/);
  });
});
