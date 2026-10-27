import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

/**
 * Starts downloading the two typefaces at the same moment as the page's code, instead of after the
 * code has run and the first words need them. Every page uses both, so none is wasted. This
 * removes the "jump" when text is first drawn in a fallback font and then redrawn.
 */
function preloadFonts(): Plugin {
  return {
    name: 'prajzo-preload-fonts',
    transformIndexHtml: {
      order: 'post',
      handler(_html, context) {
        if (!context.bundle) return []; // the development server has no built files
        return Object.keys(context.bundle)
          .filter((file) => /\/(?:inter|sora)-latin-wght-normal-[^/]+\.woff2$/.test(`/${file}`))
          .map((file) => ({
            tag: 'link',
            attrs: {
              rel: 'preload',
              as: 'font',
              type: 'font/woff2',
              crossorigin: '',
              href: `/${file}`,
            },
            injectTo: 'head' as const,
          }));
      },
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), preloadFonts()],
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
