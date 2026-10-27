import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { pipeline } from 'node:stream/promises';
import { createGunzip, createGzip } from 'node:zlib';
import { BSON, type Db, type Document, type IndexDescription } from 'mongodb';

/**
 * Database backup and restore without `mongodump` (D-059), which is not installed here and not
 * available on shared hosting. A backup is a folder with one gzipped file per collection, one
 * document per line in canonical Extended JSON (so dates, ObjectIds and numbers come back with
 * exactly the same types), and a `manifest.json` with each collection's document count, indexes,
 * options and a SHA-256 of its file. A restore checks every checksum before it writes anything,
 * and every count after.
 */

export const BACKUP_FORMAT = 1;
const MANIFEST = 'manifest.json';
const INSERT_BATCH = 1000;

const indexSchemaKeys = [
  'unique',
  'sparse',
  'expireAfterSeconds',
  'partialFilterExpression',
  'collation',
  'weights',
  'default_language',
  'language_override',
  'textIndexVersion',
  '2dsphereIndexVersion',
  'hidden',
] as const;

export type BackupManifest = {
  format: typeof BACKUP_FORMAT;
  database: string;
  createdAt: string;
  collections: {
    name: string;
    file: string;
    count: number;
    sha256: string;
    options: Document;
    indexes: Document[];
  }[];
};

export class BackupError extends Error {
  override name = 'BackupError';
}

async function sha256Of(file: string): Promise<string> {
  const hash = createHash('sha256');
  await pipeline(createReadStream(file), hash);
  return hash.digest('hex');
}

/** The collections a backup covers: everything except MongoDB's own `system.*` collections. */
async function collectionsOf(db: Db) {
  const all = await db.listCollections({ type: 'collection' }).toArray();
  return all
    .filter((info) => !info.name.startsWith('system.'))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Writes a backup of `db` into the folder `dir`, which must not exist yet or be empty. */
export async function backupDatabase(db: Db, dir: string): Promise<BackupManifest> {
  await mkdir(dir, { recursive: true });
  const manifest: BackupManifest = {
    format: BACKUP_FORMAT,
    database: db.databaseName,
    createdAt: new Date().toISOString(),
    collections: [],
  };

  for (const info of await collectionsOf(db)) {
    const file = `${info.name}.ejson.gz`;
    const target = path.join(dir, file);
    let count = 0;
    const cursor = db.collection(info.name).find({}, { sort: { _id: 1 } });
    async function* lines() {
      for await (const document of cursor) {
        count += 1;
        yield `${BSON.EJSON.stringify(document, { relaxed: false })}\n`;
      }
    }
    await pipeline(lines(), createGzip(), createWriteStream(target, { flags: 'wx' }));

    const indexes = await db.collection(info.name).indexes();
    manifest.collections.push({
      name: info.name,
      file,
      count,
      sha256: await sha256Of(target),
      options: ('options' in info ? info.options : undefined) ?? {},
      indexes: indexes.map((index) => BSON.EJSON.serialize(index, { relaxed: false })),
    });
  }

  await writeFile(path.join(dir, MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`, {
    flag: 'wx',
  });
  return manifest;
}

/** Reads and checks a backup folder: the manifest's format and every file's checksum. */
export async function verifyBackup(dir: string): Promise<BackupManifest> {
  let manifest: BackupManifest;
  try {
    manifest = JSON.parse(await readFile(path.join(dir, MANIFEST), 'utf8')) as BackupManifest;
  } catch {
    throw new BackupError(`${dir} has no readable ${MANIFEST}, so it is not a backup folder.`);
  }
  if (manifest.format !== BACKUP_FORMAT) {
    throw new BackupError(`Unknown backup format ${String(manifest.format)}.`);
  }
  for (const entry of manifest.collections) {
    if (path.basename(entry.file) !== entry.file) {
      throw new BackupError(`The manifest names a file outside the backup: ${entry.file}`);
    }
    let actual: string;
    try {
      actual = await sha256Of(path.join(dir, entry.file));
    } catch {
      throw new BackupError(`${entry.file} is missing from the backup.`);
    }
    if (actual !== entry.sha256) {
      throw new BackupError(`${entry.file} has changed or is damaged since the backup was made.`);
    }
  }
  return manifest;
}

async function* readDocuments(file: string): AsyncGenerator<Document> {
  const lines = createInterface({ input: createReadStream(file).pipe(createGunzip()) });
  for await (const line of lines) {
    if (line) yield BSON.EJSON.parse(line, { relaxed: false }) as Document;
  }
}

/**
 * Restores a backup into `db`. Refuses if any collection in the backup already holds documents
 * there, unless `replace` is set, in which case those collections are dropped first. Collections
 * that are not in the backup are left alone.
 */
export async function restoreDatabase(
  db: Db,
  dir: string,
  { replace = false }: { replace?: boolean } = {},
): Promise<BackupManifest> {
  const manifest = await verifyBackup(dir);

  const existing = new Set((await collectionsOf(db)).map((info) => info.name));
  if (!replace) {
    for (const entry of manifest.collections) {
      if (existing.has(entry.name) && (await db.collection(entry.name).estimatedDocumentCount())) {
        throw new BackupError(
          `The database "${db.databaseName}" already has data in "${entry.name}". ` +
            'Restore into an empty database, or say that it may be replaced.',
        );
      }
    }
  }

  for (const entry of manifest.collections) {
    if (existing.has(entry.name)) await db.collection(entry.name).drop();
    const collection = await db.createCollection(entry.name, entry.options);

    let batch: Document[] = [];
    for await (const document of readDocuments(path.join(dir, entry.file))) {
      batch.push(document);
      if (batch.length === INSERT_BATCH) {
        await collection.insertMany(batch, { ordered: true });
        batch = [];
      }
    }
    if (batch.length) await collection.insertMany(batch, { ordered: true });

    const indexes: IndexDescription[] = entry.indexes
      .map((raw) => BSON.EJSON.deserialize(raw, { relaxed: false }) as Document)
      .filter((index) => index.name !== '_id_')
      .map((index) => {
        const description: IndexDescription = { key: index.key as IndexDescription['key'] };
        description.name = index.name as string;
        for (const key of indexSchemaKeys) {
          if (key in index) (description as Document)[key] = index[key] as unknown;
        }
        return description;
      });
    if (indexes.length) await collection.createIndexes(indexes);

    const restored = await collection.countDocuments();
    if (restored !== entry.count) {
      throw new BackupError(
        `"${entry.name}" has ${String(restored)} documents after restoring, not ${String(entry.count)}.`,
      );
    }
  }
  return manifest;
}

/** A fingerprint of a database's contents and indexes, for comparing a restore with its source. */
export async function fingerprintDatabase(db: Db): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const info of await collectionsOf(db)) {
    const hash = createHash('sha256');
    for await (const document of db.collection(info.name).find({}, { sort: { _id: 1 } })) {
      hash.update(BSON.serialize(document));
    }
    const indexes = (await db.collection(info.name).indexes())
      // The order of an index's options may differ after a restore; the order of its key may not.
      // `background` has had no effect since MongoDB 4.2, so a restore doesn't carry it over.
      .map(({ v: _version, ns: _namespace, background: _background, ...index }) =>
        BSON.EJSON.stringify(
          Object.fromEntries(Object.entries(index).sort(([a], [b]) => a.localeCompare(b))),
          { relaxed: false },
        ),
      )
      .sort();
    hash.update(indexes.join('\n'));
    result[info.name] = hash.digest('hex');
  }
  return result;
}
