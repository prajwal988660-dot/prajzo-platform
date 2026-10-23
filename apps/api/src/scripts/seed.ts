/**
 * Development helper: loads the default service categories and packages into the database
 * named in apps/api/.env, replacing earlier versions of the same defaults.
 * Run with: npm run seed -w @prajzo/api
 */
import dns from 'node:dns';
import { ConfigError, loadEnv } from '../config/env';
import { connectDatabase, describeError, disconnectDatabase } from '../db/connection';
import { ensureCatalogueDefaults } from '../modules/catalogue/catalogue.service';

async function seed(): Promise<void> {
  const env = loadEnv();
  if (env.NODE_ENV === 'production') {
    throw new Error('The seed script is for development only.');
  }
  if (env.DNS_SERVERS) dns.setServers(env.DNS_SERVERS);

  await connectDatabase(env.MONGODB_URI);
  try {
    const counts = await ensureCatalogueDefaults({ overwrite: true });
    console.log(
      `Seeded the service catalogue: ${counts.categories} categories, ${counts.packages} packages.`,
    );
  } finally {
    await disconnectDatabase();
  }
}

seed().catch((error: unknown) => {
  console.error(
    error instanceof ConfigError ? error.message : `Seeding failed: ${describeError(error)}`,
  );
  process.exit(1);
});
