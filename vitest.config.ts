import { defineConfig } from 'vitest/config';

// Each workspace has its own config (environment, setup files); this file just lists them. The
// scripts in /scripts (such as the secrets scan) have no config of their own, so theirs is here.
export default defineConfig({
  test: {
    projects: [
      'packages/*',
      'apps/*',
      { test: { name: 'tooling', environment: 'node', include: ['scripts/**/*.test.mjs'] } },
    ],
  },
});
