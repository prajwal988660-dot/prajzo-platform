import { defineConfig } from 'vitest/config';

// Each workspace has its own config (environment, setup files); this file just lists them.
export default defineConfig({
  test: {
    projects: ['packages/*', 'apps/*'],
  },
});
