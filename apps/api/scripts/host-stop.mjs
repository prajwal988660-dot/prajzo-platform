// Stops the local host started with `npm run host:local`. It only ever stops the one process
// that is really listening on Prajzo's port, never a program that merely reuses an old
// process number.
import { defaultPort, pidFile, pidListeningOn, runningHostPid, sleep } from './host-tools.mjs';
import { rmSync } from 'node:fs';

const port = process.env.LOCAL_HOST_PORT ?? defaultPort;
const pid = runningHostPid(port);

if (!pid) {
  const other = pidListeningOn(port);
  console.log('Prajzo is not running locally.');
  if (other) {
    console.log(`(Port ${port} is used by another program, process ${other}. It was left alone.)`);
  }
  process.exit(0);
}

try {
  process.kill(pid);
  for (let attempt = 0; attempt < 20 && pidListeningOn(port) === pid; attempt += 1)
    await sleep(250);
  console.log(`Stopped the local Prajzo host (process ${pid}).`);
} catch {
  console.log('Prajzo was not running anymore.');
}
rmSync(pidFile, { force: true });
