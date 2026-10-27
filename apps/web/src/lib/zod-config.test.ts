import '@prajzo/shared';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

describe('Zod settings in the browser', () => {
  it('stop Zod writing its own code at runtime, which the content security policy forbids', () => {
    // These tests run in a browser-like environment, which has a `document`.
    expect(typeof document).toBe('object');
    expect(z.core.globalConfig.jitless).toBe(true);
  });

  it('still check things correctly', async () => {
    const { projectRequestSchema } = await import('@prajzo/shared');
    expect(projectRequestSchema.safeParse({}).success).toBe(false);
    expect(
      projectRequestSchema.safeParse({
        title: 'Website for my studio',
        categoryKey: 'business-websites',
        description: 'A simple five-page website for my photography studio, with a gallery.',
      }).success,
    ).toBe(true);
  });
});
