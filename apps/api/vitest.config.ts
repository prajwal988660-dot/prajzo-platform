import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'api',
    environment: 'node',
    // Starting an in-memory MongoDB takes a few seconds (longer on the very first run).
    hookTimeout: 120_000,
    testTimeout: 20_000,
  },
});
