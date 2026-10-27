/**
 * Proves backups work on the real database (D-059), without touching it:
 *
 *   npm run db:rehearse -w @prajzo/api
 *
 * 1. backs up the database in apps/api/.env into a temporary folder,
 * 2. restores it into a separate database, "<name>-restore-rehearsal",
 * 3. compares every document and index of the two,
 * 4. deletes the rehearsal database and the temporary folder.
 *
 * The real database is only read. The database user needs permission to create and drop the
 * rehearsal database (Atlas's "Read and write to any database" role has it).
 */
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { BackupError, backupDatabase, fingerprintDatabase, restoreDatabase } from '../db/backup';
import { runDatabaseScript } from './db-script';

runDatabaseScript('The rehearsal', async (source) => {
  const rehearsalName = `${source.databaseName}-restore-rehearsal`;
  const rehearsal = source.client.db(rehearsalName);
  const folder = await mkdtemp(path.join(os.tmpdir(), 'prajzo-rehearsal-'));
  try {
    console.log(`1. Backing up "${source.databaseName}"`);
    const manifest = await backupDatabase(source, path.join(folder, 'backup'));
    const total = manifest.collections.reduce((sum, entry) => sum + entry.count, 0);
    console.log(
      `   ${String(manifest.collections.length)} collections, ${String(total)} documents`,
    );

    console.log(`2. Restoring into "${rehearsalName}"`);
    // Left over from an earlier rehearsal that was stopped half-way: it is ours to remove.
    await rehearsal.dropDatabase();
    await restoreDatabase(rehearsal, path.join(folder, 'backup'));

    console.log('3. Comparing every document and index');
    // Sign-ins can change while this runs (a visit updates the session), so the source is read
    // after the restore, and only collections in the backup are compared.
    const [original, restored] = await Promise.all([
      fingerprintDatabase(source),
      fingerprintDatabase(rehearsal),
    ]);
    const different = manifest.collections
      .map((entry) => entry.name)
      .filter((name) => original[name] !== restored[name]);
    if (different.length) {
      throw new BackupError(
        `These collections differ after restoring: ${different.join(', ')}. ` +
          'If only "sessions" differs, someone used the website during the rehearsal: run it again.',
      );
    }
    console.log('   Identical.');
  } finally {
    console.log(`4. Removing "${rehearsalName}" and the temporary backup`);
    await rehearsal.dropDatabase().catch(() => undefined);
    await rm(folder, { recursive: true, force: true });
  }
  console.log('\nRehearsal passed: a backup of this database restores to an exact copy.');
});
