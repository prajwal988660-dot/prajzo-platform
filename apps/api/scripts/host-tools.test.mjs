import { describe, expect, it } from 'vitest';
import { listeningPidFromNetstat } from './host-tools.mjs';

const sample = `
Active Connections

  Proto  Local Address          Foreign Address        State           PID
  TCP    0.0.0.0:135            0.0.0.0:0              LISTENING       1180
  TCP    0.0.0.0:8080           0.0.0.0:0              LISTENING       24964
  TCP    [::]:8081              [::]:0                 LISTENING       777
  TCP    10.55.213.55:8080      10.55.213.99:51514     ESTABLISHED     24964
  TCP    127.0.0.1:18080        0.0.0.0:0              LISTENING       999
`;

describe('listeningPidFromNetstat', () => {
  it('finds the process listening on the port', () => {
    expect(listeningPidFromNetstat(sample, '8080')).toBe(24964);
  });

  it('finds IPv6 listeners too', () => {
    expect(listeningPidFromNetstat(sample, '8081')).toBe(777);
  });

  it('does not mistake a port that merely ends the same way (18080 is not 8080)', () => {
    const onlyLookalike =
      '  TCP    127.0.0.1:18080        0.0.0.0:0              LISTENING       999';
    expect(listeningPidFromNetstat(onlyLookalike, '8080')).toBeNull();
    expect(listeningPidFromNetstat(onlyLookalike, '18080')).toBe(999);
  });

  it('ignores connections that are not listening', () => {
    const closing = sample.replace('LISTENING       24964', 'TIME_WAIT       24964');
    expect(listeningPidFromNetstat(closing, '8080')).toBeNull();
  });

  it('returns null when nothing listens on the port or the output is empty', () => {
    expect(listeningPidFromNetstat(sample, '3000')).toBeNull();
    expect(listeningPidFromNetstat('', '8080')).toBeNull();
  });
});
