// Helpers shared by the local-hosting scripts (host-local.mjs and host-stop.mjs).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';

export const defaultPort = '8080';
export const logsDir = new URL('../logs/', import.meta.url);
export const pidFile = new URL('local-host.pid', logsDir);
export const logFile = new URL('local-host.log', logsDir);
export const serverFile = new URL('../dist/server.js', import.meta.url);

/**
 * Finds the process listening on `port` in the output of `netstat -ano -p tcp` (Windows).
 * Returns its process ID, or null when nothing is listening on that port.
 */
export function listeningPidFromNetstat(output, port) {
  for (const line of output.split(/\r?\n/)) {
    const columns = line.trim().split(/\s+/);
    if (columns.length < 5 || columns[0].toUpperCase() !== 'TCP') continue;
    const [, local, , state, pid] = columns;
    if (state?.toUpperCase() !== 'LISTENING') continue;
    if (local?.endsWith(`:${port}`) && /^\d+$/.test(pid ?? '')) return Number(pid);
  }
  return null;
}

/** The process ID that is listening on `port` right now, or null. */
export function pidListeningOn(port) {
  try {
    if (process.platform === 'win32') {
      const output = execFileSync('netstat', ['-ano', '-p', 'tcp'], { encoding: 'utf8' });
      return listeningPidFromNetstat(output, port);
    }
    const output = execFileSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'], {
      encoding: 'utf8',
    });
    const pid = Number(output.split(/\s+/)[0]);
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null; // nothing listening (lsof exits with an error), or the tool is missing
  }
}

/**
 * The process ID of the running local host, or null.
 *
 * A saved process ID alone is not trusted: after a restart of the computer the number may
 * belong to a different program. It only counts when that process is the one actually
 * listening on the Prajzo port. A leftover file is deleted.
 */
export function runningHostPid(port) {
  if (!existsSync(pidFile)) return null;
  const saved = Number(readFileSync(pidFile, 'utf8').trim());
  if (Number.isInteger(saved) && saved > 0 && pidListeningOn(port) === saved) return saved;
  rmSync(pidFile, { force: true });
  return null;
}

/** Addresses other devices on the same network can use to reach this computer. */
export function networkAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((entry) => entry && entry.family === 'IPv4' && !entry.internal)
    .map((entry) => entry.address);
}

export const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

/** Waits until `url` answers with a successful status, or `timeoutMs` passes. */
export async function waitForOk(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (response.ok) return true;
    } catch {
      // not up yet
    }
    await sleep(500);
  }
  return false;
}
