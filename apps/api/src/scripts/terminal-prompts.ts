/**
 * Questions asked in a terminal window, for the scripts people run themselves (admin:create,
 * mail:setup). askHidden hides what is typed, for passwords.
 */
import readline from 'node:readline';

export function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve, reject) => {
    rl.once('close', () => reject(new Error('No answer was given. Nothing was changed.')));
    rl.question(question, (answer) => {
      rl.removeAllListeners('close');
      rl.close();
      resolve(answer);
    });
  });
}

/** Reads a line without echoing it (works by switching the terminal to raw mode). */
export function askHidden(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const { stdin, stdout } = process;
    if (!stdin.isTTY) {
      reject(
        new Error('This command must be run in a terminal window, so it can hide the password.'),
      );
      return;
    }
    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let value = '';

    const finish = () => {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write('\n');
      resolve(value);
    };
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === '\r' || char === '\n') {
          finish();
          return;
        }
        if (char === '\u0003') {
          // Ctrl+C
          stdin.setRawMode(false);
          stdout.write('\nCancelled. Nothing was changed.\n');
          process.exit(130);
        }
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1);
        else if (char >= ' ') value += char;
      }
    };
    stdin.on('data', onData);
  });
}
