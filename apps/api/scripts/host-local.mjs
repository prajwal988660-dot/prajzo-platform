// Runs the built Prajzo app on this computer the way a real server does: one Node process
// serving the website and the API together, in the background. Settings come from
// apps/api/.env.
//
//   npm run host:local      builds, then (re)starts Prajzo in the background
//   npm run host:stop       stops it
//
// Options (after `--`): --restart  stop a running copy first   --foreground  run in this window
import { spawn } from 'node:child_process';
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  defaultPort,
  logFile,
  logsDir,
  networkAddresses,
  pidFile,
  pidListeningOn,
  runningHostPid,
  serverFile,
  sleep,
  waitForOk,
} from './host-tools.mjs';

const port = process.env.LOCAL_HOST_PORT ?? defaultPort;
const args = process.argv.slice(2);
const isChild = args.includes('--child');
const foreground = args.includes('--foreground');
const restart = args.includes('--restart');

/** Runs the server in THIS process (used by --foreground and by the background copy). */
async function runServer() {
  process.env.NODE_ENV ??= 'development'; // so apps/api/.env is read
  process.env.PORT = port;
  process.env.APP_ORIGIN = `http://localhost:${port}`;
  process.env.SERVE_WEB_APP = 'true';

  mkdirSync(logsDir, { recursive: true });
  writeFileSync(pidFile, String(process.pid));
  process.on('exit', () => rmSync(pidFile, { force: true }));
  await import(serverFile.href);
}

function printWhereItRuns() {
  console.log(`  On this computer:  http://localhost:${port}`);
  for (const address of networkAddresses()) {
    console.log(`  On your phone (same Wi-Fi):  http://${address}:${port}`);
  }
  console.log(`  Log file:          ${fileURLToPath(logFile)}`);
  console.log('  Stop it with:      npm run host:stop');
}

async function stopRunning(pid) {
  try {
    process.kill(pid);
  } catch {
    return;
  }
  for (let attempt = 0; attempt < 20 && pidListeningOn(port) === pid; attempt += 1)
    await sleep(250);
  rmSync(pidFile, { force: true });
}

async function start() {
  if (!existsSync(serverFile)) {
    console.error('No build found. Run `npm run host:local` from the repository root.');
    process.exit(1);
  }

  const running = runningHostPid(port);
  if (running && !restart) {
    console.log(`Prajzo is already running (process ${running}).`);
    printWhereItRuns();
    return;
  }
  if (running) {
    console.log(`Restarting Prajzo (stopping process ${running})...`);
    await stopRunning(running);
  }

  const other = pidListeningOn(port);
  if (other) {
    console.error(
      `Port ${port} is already used by another program (process ${other}). Close it, or choose ` +
        'another port by setting LOCAL_HOST_PORT.',
    );
    process.exit(1);
  }

  mkdirSync(logsDir, { recursive: true });
  const logPath = fileURLToPath(logFile);
  // Keep the log from growing without limit: past 5 MB, the old one is set aside.
  if (existsSync(logPath) && statSync(logPath).size > 5 * 1024 * 1024) {
    renameSync(logPath, fileURLToPath(new URL('local-host.old.log', logsDir)));
  }
  const log = openSync(logPath, 'a');
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), '--child'], {
    cwd: fileURLToPath(new URL('..', import.meta.url)), // apps/api, where .env lives
    detached: true,
    windowsHide: true,
    stdio: ['ignore', log, log],
    env: { ...process.env, LOCAL_HOST_PORT: port },
  });
  closeSync(log);
  let exitedEarly = false;
  child.once('exit', () => {
    exitedEarly = true;
  });
  child.unref();

  console.log('Starting Prajzo...');
  const deadline = Date.now() + 40_000;
  let listening = false;
  while (Date.now() < deadline && !exitedEarly) {
    if (await waitForOk(`http://localhost:${port}/api/health`, 1500)) {
      listening = true;
      break;
    }
  }
  if (!listening) {
    console.error(
      exitedEarly
        ? 'Prajzo stopped right after starting. The last lines of the log explain why:'
        : 'Prajzo did not start in time. The last lines of the log:',
    );
    const { readFileSync } = await import('node:fs');
    console.error(readFileSync(logPath, 'utf8').split('\n').slice(-12).join('\n'));
    process.exit(1);
  }

  const databaseReady = await waitForOk(`http://localhost:${port}/api/health/ready`, 15_000);
  console.log(`Prajzo is running (process ${child.pid}).`);
  printWhereItRuns();
  if (!databaseReady) {
    console.log('');
    console.log('Warning: the website is up, but the database is NOT connected.');
    console.log('If your internet address changed, add it in MongoDB Atlas → Network Access.');
    console.log('The site reconnects by itself a minute after you do. See the log for details.');
  }
}

if (isChild || foreground) {
  await runServer();
} else {
  await start();
}
