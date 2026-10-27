import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { installFatalErrorHandlers } from './fatal-errors';

function setUp(flush: (done: () => void) => void = (done) => done()) {
  const target = Object.assign(new EventEmitter(), { exit: vi.fn<(code: number) => void>() });
  const logger = { fatal: vi.fn(), flush: vi.fn(flush) };
  installFatalErrorHandlers(logger as never, target as never);
  return { target, logger };
}

describe('installFatalErrorHandlers', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('logs an uncaught error as fatal, flushes the log, then exits with code 1', () => {
    const { target, logger } = setUp();
    const error = new Error('boom');
    target.emit('uncaughtException', error);

    expect(logger.fatal).toHaveBeenCalledWith(
      { err: error, kind: 'uncaughtException' },
      'The API crashed and is stopping',
    );
    expect(logger.flush).toHaveBeenCalledOnce();
    expect(target.exit).toHaveBeenCalledExactlyOnceWith(1);
  });

  it('treats an unhandled promise rejection the same way', () => {
    const { target, logger } = setUp();
    target.emit('unhandledRejection', 'not even an Error');

    expect(logger.fatal).toHaveBeenCalledWith(
      { err: 'not even an Error', kind: 'unhandledRejection' },
      'The API crashed and is stopping',
    );
    expect(target.exit).toHaveBeenCalledExactlyOnceWith(1);
  });

  it('exits after two seconds if the log never finishes flushing', () => {
    vi.useFakeTimers();
    const { target } = setUp(() => undefined);
    target.emit('uncaughtException', new Error('boom'));

    expect(target.exit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2000);
    expect(target.exit).toHaveBeenCalledExactlyOnceWith(1);
  });

  it('handles only the first crash while it is already stopping', () => {
    const { target, logger } = setUp(() => undefined);
    target.emit('uncaughtException', new Error('first'));
    target.emit('unhandledRejection', new Error('second'));
    expect(logger.fatal).toHaveBeenCalledOnce();
  });
});
