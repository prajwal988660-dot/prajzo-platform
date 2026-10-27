import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['**/dist/', '**/coverage/', 'legacy/', 'assets/']),

  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    extends: [js.configs.recommended],
  },

  // TypeScript, with rules that use type information (e.g. catching un-awaited promises).
  {
    files: ['**/*.{ts,tsx}'],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },

  // Browser code
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended],
    languageOptions: { globals: globals.browser },
  },

  // Node code: API, shared package, config files and scripts
  {
    files: [
      'apps/api/**/*.{ts,js,mjs}',
      'apps/web/scripts/**/*.mjs',
      'scripts/**/*.mjs',
      'packages/**/*.ts',
      'e2e/**/*.ts',
      'e2e-production/**/*.ts',
      '*.{js,ts}',
      'apps/*/*.config.ts',
      'packages/*/*.config.ts',
    ],
    languageOptions: { globals: globals.node },
  },

  // These scripts draw their pictures inside a browser page, so they use browser code as well.
  {
    files: ['scripts/make-brand-images.mjs', 'scripts/make-demo-images.mjs'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
]);
