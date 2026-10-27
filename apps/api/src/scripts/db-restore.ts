/**
 * Restores a backup made by db:backup (D-059), into a database you name, on the server in
 * apps/api/.env:
 *
 *   npm run db:restore -w @prajzo/api -- <backup folder> --into prajzo-restored
 *   npm run db:restore -w @prajzo/api -- <backup folder> --into prajzo --replace
 *
 * Every file's checksum is checked before anything is written. Without --replace it refuses to
 * write into a collection that already has data. With --replace, the collections in the backup
 * are dropped and written again; collections that are not in the backup are left alone.
 * Stop the website first when replacing the database it uses.
 */
import path from 'node:path';
import { BackupError, restoreDatabase } from '../db/backup';
import { readArguments, runDatabaseScript } from './db-script';

runDatabaseScript('The restore', async (connected) => {
  const { values, flags, positional } = readArguments(process.argv.slice(2), ['replace']);
  const folder = positional[0];
  const into = values.get('into');
  if (!folder || !into) {
    throw new BackupError(
      'Say which backup and which database, for example: ' +
        'npm run db:restore -w @prajzo/api -- backups/prajzo-2026-10-27-224301 --into prajzo-restored',
    );
  }

  const db = connected.client.db(into);
  const replace = flags.has('replace');
  console.log(
    `Restoring ${path.resolve(folder)} into the database "${into}"` +
      (replace ? ', replacing what is there' : ''),
  );
  const manifest = await restoreDatabase(db, path.resolve(folder), { replace });
  for (const entry of manifest.collections) {
    console.log(`  ${entry.name.padEnd(24)} ${String(entry.count).padStart(7)} documents`);
  }
  console.log(`\nDone. Backup made ${manifest.createdAt} from "${manifest.database}".`);
});
