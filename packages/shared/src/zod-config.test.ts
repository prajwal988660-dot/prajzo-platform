import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import './index';

describe('Zod settings on the server', () => {
  it('keep the run-time speed-up, which only a browser with a strict policy has to give up', () => {
    // These tests run in Node, where there is no `document`.
    expect('document' in globalThis).toBe(false);
    expect(z.core.globalConfig.jitless).not.toBe(true);
  });
});
