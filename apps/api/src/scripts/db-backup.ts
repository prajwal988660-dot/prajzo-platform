/**
 * Backs up the database named in apps/api/.env into a new folder (D-059).
 *
 *   npm run db:backup -w @prajzo/api                       -> apps/api/backups/<database>-<time>
 *   npm run db:backup -w @prajzo/api -- --out D:\backups\x  -> that folder (must not exist yet)
 *
 * A backup holds every customer's personal data and the sign-in sessions: keep it somewhere only
 * you can reach, never in git (apps/api/backups/ is ignored), and delete old ones.
 */
import path from 'node:path';
import { backupDatabase } from '../db/backup';
import { folderTimestamp, readArguments, runDatabaseScript } from './db-script';

runDatabaseScript('The backup', async (db) => {
  const { values } = readArguments(process.argv.slice(2));
  const folder = path.resolve(
    values.get('out') ?? path.join('backups', `${db.databaseName}-${folderTimestamp()}`),
  );

  console.log(`Backing up the database "${db.databaseName}" into ${folder}`);
  const manifest = await backupDatabase(db, folder);
  for (const entry of manifest.collections) {
    console.log(`  ${entry.name.padEnd(24)} ${String(entry.count).padStart(7)} documents`);
  }
  console.log(
    `\nDone. Restore it with: npm run db:restore -w @prajzo/api -- "${folder}" --into <name>`,
  );
});
