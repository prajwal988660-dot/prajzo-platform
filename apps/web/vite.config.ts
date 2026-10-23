import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    // In development the API runs separately; the browser still talks to one address.
    // End-to-end tests point this at their own throw-away API.
    proxy: { '/api': process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:4000' },
  },
  preview: { port: 4173, strictPort: true },
  test: {
    name: 'web',
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
