import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import {
  isRealEnvironmentFile,
  passwordsInAddresses,
  problemsInText,
  scanRepository,
  secretsInEnvironmentFile,
} from './scan-for-secrets.mjs';

// None of these is written out whole in this file, or the scan of this very repository would
// (rightly) find them here. They are invented and protect nothing.
const awsKey = ['AKIA', 'ABCDEFGHIJKLMNOP'].join('');
const privateKey = ['-----BEGIN RSA PRIV', 'ATE KEY-----'].join('');
const databasePassword = ['Zq7Lm2', 'Xv9Kp4Rt8'].join('');
const sessionSecret = ['4f9c1a7be2d84a6f', '9b3e5c0d7a1f8e26'].join('');
const addressWith = (password) =>
  `mongodb+srv://prajzo:${password}@cluster0.example.mongodb.net/db`;

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), 'scan-for-secrets.mjs');
const folders = [];

afterEach(() => {
  for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true });
});

/** A throw-away git repository. */
function newRepo() {
  const root = mkdtempSync(path.join(tmpdir(), 'prajzo-scan-'));
  folders.push(root);
  const git = (...args) =>
    execFileSync(
      'git',
      ['-C', root, '-c', 'user.name=Test', '-c', 'user.email=test@example.com', ...args],
      { stdio: 'pipe' },
    );
  git('init', '-q');
  git('config', 'commit.gpgsign', 'false');
  return {
    root,
    write(file, text) {
      mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      writeFileSync(path.join(root, file), text);
    },
    /** What every real repository does: real environment files stay on one computer. */
    keepEnvironmentFilesLocal() {
      this.write('.gitignore', '.env\n.env.*\n!.env.example\n');
    },
    commit(message = 'A commit') {
      git('add', '-A');
      git('commit', '-q', '-m', message);
      return git('rev-parse', '--short=7', 'HEAD').toString().trim();
    },
  };
}

describe('recognising secrets in text', () => {
  it.each([
    ['a private key', `key:\n${privateKey}\nMIIEvQ`],
    ['an AWS access key', `aws_key = ${awsKey}`],
    ['a GitHub token', `token ${['ghp', '_', 'a'.repeat(36)].join('')}`],
    ['a Slack token', ['xox', 'b-', '1234567890-abcdefghij'].join('')],
    ['a live Stripe key', ['sk', '_live_', 'a1b2c3d4e5f6g7h8i9'].join('')],
    ['a database address with a password', `MONGODB_URI=${addressWith(databasePassword)}`],
  ])('finds %s', (name, text) => {
    expect(problemsInText(text)).toContain(name);
  });

  it('does not mistake placeholders, templates and ordinary text for secrets', () => {
    for (const text of [
      'Looks like: mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/prajzo',
      'mongodb+srv://<db_username>:<db_password>@cluster0.mongodb.net/',
      'mongodb://user:pass@localhost/db',
      'mongodb://admin:${PASSWORD}@db/prod',
      'mongodb://localhost:27017/prajzo',
      'AKIA is also a word, and so is ghp_ or xoxb-',
      'A normal sentence about passwords and keys and tokens, with no secret in it.',
      'sha512-8ZcvV5S0qzYrXLwJ7nKQ2tPqgQh3eE8jA0kG7iVwQ0n8c3dQ0u8m3T9vYHqR1eB6a7l0nKxS==',
    ]) {
      expect(problemsInText(text), text).toEqual([]);
    }
  });

  it('knows the passwords that tests invented to prove errors hide them', () => {
    expect(passwordsInAddresses('mongodb://admin:hunter2@db')).toEqual([]);
    expect(
      passwordsInAddresses('mongodb+srv://prajzo:p@ss@w0rd@cluster0.abc.mongodb.net/x'),
    ).toEqual([]);
    expect(passwordsInAddresses(addressWith(databasePassword))).toEqual([databasePassword]);
  });

  it('reads a password that contains an @ as one password', () => {
    expect(passwordsInAddresses(addressWith(`${databasePassword}@2`))).toEqual([
      `${databasePassword}@2`,
    ]);
  });
});

describe('environment files', () => {
  it('tells a real one from an example', () => {
    for (const real of ['.env', '.env.local', '.env.production', 'apps/api/.env']) {
      expect(isRealEnvironmentFile(real), real).toBe(true);
    }
    for (const fine of ['.env.example', 'apps/api/.env.example', 'env.ts', 'ENVIRONMENT.md']) {
      expect(isRealEnvironmentFile(fine), fine).toBe(false);
    }
  });

  it('picks out the secret values, and the password inside an address', () => {
    const found = secretsInEnvironmentFile(
      [
        '# a comment with SESSION_SECRET=ignored-in-a-comment',
        'PORT=4000',
        'APP_ORIGIN=http://localhost:5173',
        'LOG_LEVEL=info',
        'TRUST_PROXY=true',
        `SESSION_SECRET=${sessionSecret}`,
        `STAGING_PASSWORD="${databasePassword}"`,
        `MONGODB_URI=${addressWith(databasePassword)}`,
        'SMTP_PASSWORD=short',
        'EMPTY_SECRET=',
      ].join('\n'),
    );

    expect(found.map(({ name }) => name).sort()).toEqual([
      'MONGODB_URI (the password in it)',
      'SESSION_SECRET',
      'STAGING_PASSWORD',
    ]);
    expect(found.find(({ name }) => name === 'STAGING_PASSWORD')?.value).toBe(databasePassword);
  });
});

describe('scanning a repository', () => {
  it('finds nothing in an ordinary repository', () => {
    const repo = newRepo();
    repo.write('README.md', '# A project\n\nNothing secret here.\n');
    repo.write('apps/api/.env.example', 'SESSION_SECRET=\nMONGODB_URI=\n');
    repo.commit();

    const result = scanRepository(repo.root, { history: true });

    expect(result.findings).toEqual([]);
    expect(result.files).toBe(2);
    expect(result.commits).toBe(1);
  });

  it('finds a secret format in a tracked file, naming the file and not the secret', () => {
    const repo = newRepo();
    repo.write('docs/notes.md', `Use this: ${awsKey}\n${privateKey}\n`);
    repo.commit();

    const { findings } = scanRepository(repo.root);

    expect(findings).toContain('an AWS access key in docs/notes.md');
    expect(findings).toContain('a private key in docs/notes.md');
    expect(findings.join('\n')).not.toContain(awsKey);
  });

  it('also looks at new files that are not committed yet, so a leak is caught before the commit', () => {
    const repo = newRepo();
    repo.write('README.md', 'Hello\n');
    repo.commit();
    repo.write('docs/new-notes.md', `Database: ${addressWith(databasePassword)}\n`);
    repo.write('.env.local', 'PORT=4000\n');

    const { findings, files } = scanRepository(repo.root);

    expect(files).toBe(3);
    expect(findings).toContain('a database address with a password in docs/new-notes.md');
    expect(findings).toContain('an environment file is not ignored by git: .env.local');
  });

  it('leaves out new files that git ignores, such as a real .env', () => {
    const repo = newRepo();
    repo.write('.gitignore', '.env\n.env.*\n');
    repo.write('.env', `SESSION_SECRET=${sessionSecret}\n`);
    repo.commit();

    const result = scanRepository(repo.root);

    expect(result.findings).toEqual([]);
    expect(result.files).toBe(1);
  });

  it('finds an environment file that git is tracking', () => {
    const repo = newRepo();
    repo.write('apps/api/.env', 'PORT=4000\n');
    repo.commit();

    expect(scanRepository(repo.root).findings).toContain(
      'an environment file is tracked: apps/api/.env',
    );
  });

  it('finds the real values from a local .env file wherever they turn up, without printing them', () => {
    const repo = newRepo();
    repo.keepEnvironmentFilesLocal();
    repo.write(
      'apps/api/.env',
      `SESSION_SECRET=${sessionSecret}\nMONGODB_URI=${addressWith(databasePassword)}\nPORT=4000\n`,
    );
    repo.write('docs/SETUP.md', `Connect with ${addressWith(databasePassword)} to try it.\n`);
    repo.write('apps/api/src/example.test.ts', `const secret = '${sessionSecret}';\n`);
    repo.commit();

    const result = scanRepository(repo.root);

    expect(result.values.sort()).toEqual(['MONGODB_URI (the password in it)', 'SESSION_SECRET']);
    expect(result.findings).toEqual(
      expect.arrayContaining([
        'your local MONGODB_URI (the password in it) in docs/SETUP.md',
        'your local SESSION_SECRET in apps/api/src/example.test.ts',
      ]),
    );
    for (const finding of result.findings) {
      expect(finding).not.toContain(sessionSecret);
      expect(finding).not.toContain(databasePassword);
    }
  });

  it('with --history, finds a secret that was committed and later removed', () => {
    const repo = newRepo();
    repo.keepEnvironmentFilesLocal();
    repo.write('apps/api/.env', `SESSION_SECRET=${sessionSecret}\n`);
    repo.write('docs/notes.md', `Temporary: ${sessionSecret}\n`);
    const leaked = repo.commit('Add notes');
    repo.write('docs/notes.md', 'Cleaned up.\n');
    const removed = repo.commit('Remove the secret again');

    expect(scanRepository(repo.root).findings).toEqual([]); // gone from the files...
    const { findings } = scanRepository(repo.root, { history: true });
    // ...but not from git: the commit that added it, and the one that removed it (which shows it
    // as the deleted line).
    expect(findings.sort()).toEqual(
      [
        `your local SESSION_SECRET in commit ${leaked}`,
        `your local SESSION_SECRET in commit ${removed}`,
      ].sort(),
    );
    expect(findings.join('\n')).not.toContain(sessionSecret);
  });

  it('with --history, finds it on another branch too', () => {
    const repo = newRepo();
    repo.write('README.md', 'Hello\n');
    repo.commit('First');
    execFileSync('git', ['-C', repo.root, 'checkout', '-q', '-b', 'other']);
    repo.write('notes.txt', `${awsKey}\n`);
    const onOther = repo.commit('Add a key on another branch');
    execFileSync('git', ['-C', repo.root, 'checkout', '-q', '-']);

    expect(scanRepository(repo.root).findings).toEqual([]);
    expect(scanRepository(repo.root, { history: true }).findings).toEqual([
      `an AWS access key in commit ${onOther}`,
    ]);
  });
});

describe('running it as a command', () => {
  const run = (root, ...flags) =>
    spawnSync(process.execPath, [script, '--root', root, ...flags], { encoding: 'utf8' });

  it('says OK and exits with 0 when nothing is found', () => {
    const repo = newRepo();
    repo.write('README.md', 'Hello\n');
    repo.commit();

    const result = run(repo.root, '--history');

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('OK: no secrets found.');
    expect(result.stdout).toContain('Scanned 1 files and 1 commits');
  });

  it('lists what it found and exits with 1, and prints no secret anywhere', () => {
    const repo = newRepo();
    repo.keepEnvironmentFilesLocal();
    repo.write('apps/api/.env', `SESSION_SECRET=${sessionSecret}\n`);
    repo.write('docs/notes.md', `${sessionSecret}\n${awsKey}\n`);
    repo.commit();

    const result = run(repo.root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('FOUND:');
    expect(result.stderr).toContain('your local SESSION_SECRET in docs/notes.md');
    expect(result.stderr).toContain('an AWS access key in docs/notes.md');
    expect(result.stdout + result.stderr).not.toContain(sessionSecret);
    expect(result.stdout + result.stderr).not.toContain(awsKey);
  });
});
