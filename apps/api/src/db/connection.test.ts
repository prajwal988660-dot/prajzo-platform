import mongoose from 'mongoose';
import { describe, expect, it, vi } from 'vitest';
import type { Logger } from '../lib/logger';
import { connectionHint, describeError, watchConnection } from './connection';

describe('describeError', () => {
  it('removes credentials from connection strings before logging', () => {
    const text = describeError(
      new Error(
        'getaddrinfo ENOTFOUND for mongodb+srv://prajzo:S3cret!@cluster0.abc.mongodb.net/prajzo',
      ),
    );
    expect(text).not.toContain('S3cret!');
    expect(text).toContain('mongodb+srv://***@cluster0.abc.mongodb.net');
  });

  it('also hides passwords that contain "@"', () => {
    const text = describeError(
      new Error('Invalid URI mongodb+srv://prajzo:p@ss@w0rd@cluster0.abc.mongodb.net/prajzo'),
    );
    expect(text).not.toMatch(/p@ss|w0rd/);
    expect(text).toContain('mongodb+srv://***@cluster0.abc.mongodb.net');
  });

  it('handles values that are not Error objects', () => {
    expect(describeError('plain failure')).toBe('plain failure');
  });
});

describe('connectionHint', () => {
  it('points to DNS_SERVERS when the mongodb+srv address cannot be looked up', () => {
    const error = new Error('querySrv ECONNREFUSED _mongodb._tcp.prajzo-dev.abcde.mongodb.net');
    expect(connectionHint(error)).toContain('DNS_SERVERS=1.1.1.1,8.8.8.8');
  });

  it('points to the database user when Atlas rejects the password', () => {
    const error = new Error('bad auth : authentication failed');
    expect(connectionHint(error)).toMatch(/username or password/);
  });

  it('points to Network Access when Atlas does not answer', () => {
    const error = new Error(
      "Could not connect to any servers in your MongoDB Atlas cluster. One common reason is that you're trying to access the database from an IP that isn't whitelisted.",
    );
    expect(connectionHint(error)).toMatch(/Network Access/);
  });

  it('recognises the TLS alert Atlas sends to an IP address that is not allowed', () => {
    const error = new Error(
      'MongoNetworkError: error:0A000438:SSL routines:ssl3_read_bytes:tlsv1 alert internal error:SSL alert number 80',
    );
    expect(connectionHint(error)).toMatch(/Network Access/);
  });

  it('falls back to a general hint', () => {
    expect(connectionHint(new Error('something unusual'))).toMatch(/Check MONGODB_URI/);
  });
});

describe('watchConnection', () => {
  function recordingLogger() {
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    return { logger, asLogger: logger as unknown as Logger };
  }

  it('explains a lost connection and announces when it is restored', () => {
    const { logger, asLogger } = recordingLogger();
    const stop = watchConnection(asLogger);

    mongoose.connection.emit('connected');
    mongoose.connection.emit('disconnected');
    expect(logger.warn).toHaveBeenCalledOnce();
    expect(String(logger.warn.mock.calls[0]?.[0])).toMatch(/Network Access/);

    mongoose.connection.emit('reconnected');
    expect(logger.info).toHaveBeenCalledWith('Database connection restored');
    stop();
  });

  it('logs database errors with a next step and no credentials', () => {
    const { logger, asLogger } = recordingLogger();
    const stop = watchConnection(asLogger);

    mongoose.connection.emit('connected');
    mongoose.connection.emit(
      'error',
      new Error('bad auth : authentication failed for mongodb://user:S3cret@host.example/db'),
    );
    expect(logger.error).toHaveBeenCalledOnce();
    const [details, message] = logger.error.mock.calls[0] as [{ reason: string }, string];
    expect(message).toMatch(/username or password/);
    expect(JSON.stringify(details)).not.toContain('S3cret');
    stop();
  });

  it('stays quiet before the first connection, because startup failures are reported elsewhere', () => {
    const { logger, asLogger } = recordingLogger();
    const stop = watchConnection(asLogger);

    mongoose.connection.emit('disconnected');
    mongoose.connection.emit('error', new Error('Could not connect to any servers'));
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
    stop();
  });

  it('stops logging once stopped, so a deliberate shutdown is not reported as a failure', () => {
    const { logger, asLogger } = recordingLogger();
    const stop = watchConnection(asLogger);
    mongoose.connection.emit('connected');
    stop();

    mongoose.connection.emit('disconnected');
    mongoose.connection.emit('reconnected');
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
  });
});
