/**
 * Looks for secrets that must never be committed (D-052): in every file git tracks and, with
 * --history, in everything git has ever recorded on any branch.
 *
 * It looks for three things:
 *
 * 1. a real environment file being tracked (only `.env.example` files belong in git)
 * 2. well-known secret formats: private keys, cloud and chat tokens, database addresses with a
 *    real password in them
 * 3. the actual secret values in your own local `.env` files (the database password, the session
 *    secret...), wherever they have turned up in git. This is the check that catches the mistake
 *    that really happens: pasting your own password into a document or a test.
 *
 * It only ever prints the NAME of what it found, where, and in which commit. A secret is never
 * printed, so the output of this script is safe to paste anywhere.
 *
 *   node scripts/scan-for-secrets.mjs              the files in git, and new files not ignored
 *   node scripts/scan-for-secrets.mjs --history    and every commit on every branch
 *   node scripts/scan-for-secrets.mjs --root DIR   scan another repository (used by the tests)
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Words that mean "put your own value here" rather than a real password. */
const placeholderPassword =
  /^(?:pass|password|passwd|secret|changeme|change-me|example|placeholder|test|testing|dummy|user|username|x+|\*+|\.\.\.|your[-_ ]?password|db[-_]?password)$/i;

/** Well-known secret formats. Each is specific enough to almost never match by accident. */
export const secretPatterns = [
  { name: 'a private key', regex: /-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----/ },
  { name: 'an AWS access key', regex: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  {
    name: 'a GitHub token',
    regex: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{50,})\b/,
  },
  { name: 'a Slack token', regex: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/ },
  { name: 'a live Stripe key', regex: /\b[rs]k_live_[0-9A-Za-z]{16,}\b/ },
  { name: 'a Google API key', regex: /\bAIza[0-9A-Za-z_-]{35}\b/ },
];

/**
 * Invented passwords that the tests use to prove that a password is hidden when an error message
 * is shown or logged. They were never anyone's real password. Adding a value here is a decision:
 * never add one that protects something.
 */
const inventedPasswords = new Set(['S3cret!', 'S3cret', 'p@ss@w0rd', 'hunter2']);

/**
 * A database address with a user name and password in it: `scheme://user:password@host`. The
 * password may itself contain an @ (people write it that way), so it runs up to the last @.
 */
const addressWithPassword =
  /\b(?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|redis|rediss|amqps?):\/\/[^\s:@/<>'"`$]+:([^\s/<>'"`$]+)@/g;

/** The passwords inside database addresses in some text, leaving out obvious placeholders. */
export function passwordsInAddresses(text) {
  const found = [];
  for (const match of text.matchAll(addressWithPassword)) {
    const password = match[1] ?? '';
    if (password && !placeholderPassword.test(password) && !inventedPasswords.has(password)) {
      found.push(password);
    }
  }
  return found;
}

/** What is wrong with this text, by name (never the secret itself). */
export function problemsInText(text) {
  const problems = secretPatterns.filter(({ regex }) => regex.test(text)).map(({ name }) => name);
  if (passwordsInAddresses(text).length > 0) problems.push('a database address with a password');
  return problems;
}

/** Whether git is tracking a file that should only ever exist on one computer. */
export function isRealEnvironmentFile(filePath) {
  const name = path.posix.basename(filePath.split(path.sep).join('/'));
  return /^\.env(\..+)?$/.test(name) && !/\.(?:example|sample|template)$/.test(name);
}

const secretName = /SECRET|PASSWORD|PASSWD|TOKEN|PRIVATE|API_?KEY|CREDENTIAL/i;

/**
 * The values in an environment file that must stay private: anything with a secret-sounding name,
 * and the password inside any database address. Short values are ignored (they could not be
 * told apart from ordinary words).
 */
export function secretsInEnvironmentFile(text) {
  const secrets = [];
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match) continue;
    const [, name = '', rawValue = ''] = match;
    const value = rawValue.replace(/^(['"])(.*)\1$/, '$2');
    if (value.length < 8 || /^(?:true|false|\d+)$/i.test(value)) continue;
    if (secretName.test(name)) secrets.push({ name, value });
    for (const password of passwordsInAddresses(value)) {
      if (password.length >= 6)
        secrets.push({ name: `${name} (the password in it)`, value: password });
    }
  }
  return secrets;
}

const git = (root, args, options = {}) =>
  execFileSync('git', ['-C', root, ...args], {
    encoding: 'utf8',
    maxBuffer: 512 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  });

/** The local environment files (never tracked by git) in a repository, found by name. */
function localEnvironmentFiles(root) {
  const found = [];
  const walk = (directory, depth) => {
    if (depth > 4) return;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(full, depth + 1);
      else if (isRealEnvironmentFile(entry.name)) found.push(full);
    }
  };
  walk(root, 0);
  return found;
}

/**
 * Scans a repository. Returns what it checked and what it found; the findings name the secret
 * and where it is, and never contain its value.
 */
export function scanRepository(root, { history = false } = {}) {
  const findings = [];
  // The files git tracks, plus new ones it would pick up (so a secret pasted into a new file is
  // caught before the commit, not after).
  const tracked = new Set(git(root, ['ls-files', '-z']).split('\0').filter(Boolean));
  const trackedFiles = git(root, ['ls-files', '-z', '--cached', '--others', '--exclude-standard'])
    .split('\0')
    .filter(Boolean);

  // The secret values of this computer, kept only in memory.
  const values = localEnvironmentFiles(root).flatMap((file) =>
    secretsInEnvironmentFile(readFileSync(file, 'utf8')),
  );
  const checkText = (text, where) => {
    for (const problem of problemsInText(text)) findings.push(`${problem} in ${where}`);
    for (const { name, value } of values) {
      if (text.includes(value)) findings.push(`your local ${name} in ${where}`);
    }
  };

  for (const file of trackedFiles) {
    if (isRealEnvironmentFile(file)) {
      findings.push(
        tracked.has(file)
          ? `an environment file is tracked: ${file}`
          : `an environment file is not ignored by git: ${file}`,
      );
    }
    const fullPath = path.join(root, file);
    if (!existsSync(fullPath)) continue;
    const content = readFileSync(fullPath);
    if (content.includes(0)) continue; // an image or font, not text
    checkText(content.toString('utf8'), file);
  }

  let commits = 0;
  if (history) {
    const hashes = git(root, ['rev-list', '--all']).split('\n').filter(Boolean);
    commits = hashes.length;
    for (const hash of hashes) {
      const tracked = git(root, ['ls-tree', '-r', '--name-only', '-z', hash])
        .split('\0')
        .filter(isRealEnvironmentFile);
      for (const file of tracked)
        findings.push(`an environment file is tracked: ${file} (commit ${hash.slice(0, 7)})`);
      const changes = git(root, ['show', '--no-color', '--no-textconv', '--format=', '-m', hash]);
      checkText(changes, `commit ${hash.slice(0, 7)}`);
    }
  }

  return {
    files: trackedFiles.length,
    commits,
    values: [...new Set(values.map(({ name }) => name))],
    // The same thing found in many places is reported once per place; keep the list tidy.
    findings: [...new Set(findings)],
  };
}

function main(argv) {
  const rootIndex = argv.indexOf('--root');
  const root = path.resolve(
    rootIndex >= 0 && argv[rootIndex + 1]
      ? argv[rootIndex + 1]
      : path.join(path.dirname(fileURLToPath(import.meta.url)), '..'),
  );
  const history = argv.includes('--history');

  const result = scanRepository(root, { history });
  const scope = history
    ? `${result.files} files and ${result.commits} commits`
    : `${result.files} files`;
  console.log(`Scanned ${scope} for ${secretPatterns.length + 2} kinds of secret.`);
  console.log(
    result.values.length > 0
      ? `Also looked for the real values of: ${result.values.join(', ')} (from your local .env files).`
      : 'No local .env file with secrets was found, so only the secret formats were checked.',
  );
  if (result.findings.length === 0) {
    console.log('OK: no secrets found.');
    return 0;
  }
  console.error('FOUND:');
  for (const finding of result.findings) console.error(`  - ${finding}`);
  console.error(
    'A secret that was committed must be treated as public: change it at its source (rotate ' +
      'it), then remove it from the files. Removing it from git history as well needs a rewrite.',
  );
  return 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
