import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { BSON, type Db } from 'mongodb';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ensureCatalogueDefaults } from '../modules/catalogue/catalogue.service';
import { startTestDatabase } from '../test/helpers';
import {
  customerDoes,
  mongoose,
  newProjectApp,
  projectWithQuote,
  resetEverything,
  signedInAdmin,
  signedInCustomer,
} from '../test/project-helpers';
import { backupDatabase, fingerprintDatabase, restoreDatabase, verifyBackup } from './backup';

const RESTORE_DB = 'prajzo-restore-rehearsal';

describe('database backup and restore (D-059)', () => {
  let database: { stop: () => Promise<void> };
  let source: Db;
  let target: Db;
  let folder: string;

  beforeAll(async () => {
    database = await startTestDatabase();
    await ensureCatalogueDefaults();
    source = mongoose.connection.db as Db;
    target = mongoose.connection.getClient().db(RESTORE_DB);

    // Realistic data, made the way the website makes it: accounts, sessions, a project taken
    // through a quote and its acceptance, a contact message, the activity log and counters.
    await resetEverything();
    const app = newProjectApp();
    const customer = await signedInCustomer(app);
    const admin = await signedInAdmin(app);
    const reference = await projectWithQuote(customer, admin);
    const accepted = await customerDoes(customer, reference, {
      action: 'accept-quote',
      quoteVersion: 1,
    });
    expect(accepted.status).toBe(200);
    await projectWithQuote(await signedInCustomer(app, 'ravi@example.com', 'Ravi Kumar'), admin);
    const contact = await request(app).post('/api/v1/contact').send({
      name: 'Meera Iyer',
      email: 'meera@example.com',
      message: 'Can you build a catalogue website for my saree shop? About forty products.',
      consent: true,
    });
    expect(contact.status).toBe(201);

    // Types the website may not use yet, so they are known to survive too.
    await source.collection('typeprobes').insertOne({
      decimal: BSON.Decimal128.fromString('12345.6789'),
      long: BSON.Long.fromString('9007199254740993'),
      int: 7,
      double: 7.5,
      binary: new BSON.Binary(Buffer.from([0, 1, 2, 254, 255])),
      date: new Date('2026-10-27T05:30:00.123Z'),
      nothing: null,
      nested: { list: [1, 'two', { three: new BSON.ObjectId() }] },
    });
  }, 120_000);

  beforeEach(async () => {
    folder = await mkdtemp(path.join(os.tmpdir(), 'prajzo-backup-test-'));
    await target.dropDatabase();
  });

  afterEach(async () => {
    await rm(folder, { recursive: true, force: true });
  });

  afterAll(async () => {
    await database.stop();
  });

  it('restores an exact copy: every document, type and index', async () => {
    const manifest = await backupDatabase(source, folder);
    for (const name of ['users', 'projectrequests', 'auditlogs', 'contactmessages', 'sessions']) {
      expect(manifest.collections.find((entry) => entry.name === name)?.count).toBeGreaterThan(0);
    }

    await restoreDatabase(target, folder);
    expect(await fingerprintDatabase(target)).toEqual(await fingerprintDatabase(source));

    const probe = await target.collection('typeprobes').findOne({});
    expect(probe?.decimal).toBeInstanceOf(BSON.Decimal128);
    expect(probe?.long).toBeInstanceOf(BSON.Long);
    expect(probe?.date).toEqual(new Date('2026-10-27T05:30:00.123Z'));

    // Rules that live in indexes still hold: one account per email address.
    const users = target.collection('users');
    const someone = await users.findOne({}, { projection: { _id: 0 } });
    await expect(users.insertOne({ ...someone })).rejects.toThrow(/duplicate key/);
  });

  it('notices a changed or missing file before writing anything', async () => {
    await backupDatabase(source, folder);
    const file = path.join(folder, 'users.ejson.gz');
    const original = await readFile(file);

    await writeFile(file, Buffer.concat([original, Buffer.from([0])]));
    await expect(restoreDatabase(target, folder)).rejects.toThrow(/changed or is damaged/);
    await rm(file);
    await expect(verifyBackup(folder)).rejects.toThrow(/missing/);
    expect(await target.listCollections().toArray()).toEqual([]);
  });

  it('refuses a manifest that points outside the backup folder', async () => {
    await backupDatabase(source, folder);
    const manifestFile = path.join(folder, 'manifest.json');
    const manifest = JSON.parse(await readFile(manifestFile, 'utf8')) as {
      collections: { file: string }[];
    };
    manifest.collections[0]!.file = '../elsewhere.ejson.gz';
    await writeFile(manifestFile, JSON.stringify(manifest));
    await expect(verifyBackup(folder)).rejects.toThrow(/outside the backup/);
  });

  it('will not mix a backup into a database that has data, unless told to replace it', async () => {
    await backupDatabase(source, folder);
    await target.collection('users').insertOne({ email: 'someone-else@example.com' });

    await expect(restoreDatabase(target, folder)).rejects.toThrow(/already has data in "users"/);

    await target.collection('notinbackup').insertOne({ keep: true });
    await restoreDatabase(target, folder, { replace: true });
    const { notinbackup, ...restored } = await fingerprintDatabase(target);
    expect(restored).toEqual(await fingerprintDatabase(source));
    expect(notinbackup).toBeDefined();
  });

  it('never overwrites an existing backup', async () => {
    await backupDatabase(source, folder);
    await expect(backupDatabase(source, folder)).rejects.toThrow(/EEXIST/);
    expect((await readdir(folder)).length).toBeGreaterThan(1);
  });
});
