import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const TEST_FILES = ['**/*.test.{ts,tsx}', '**/test/**', '**/testing/**'];

export default defineConfig(
  { ignores: ['**/dist/**', '**/coverage/**', '**/node_modules/**'] },

  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // CLAUDE.md rules made enforceable
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      'no-console': 'error',
      'max-lines': ['error', { max: 200, skipBlankLines: true, skipComments: true }],
      // Line count per function is a poor proxy with factories and JSX; cyclomatic complexity is not.
      complexity: ['error', 10],
      // Correctness
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      eqeqeq: 'error',
    },
  },

  {
    files: ['apps/web/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat['recommended-latest']],
    languageOptions: { globals: globals.browser },
  },

  {
    files: ['apps/api/**/*.ts', 'packages/**/*.ts'],
    languageOptions: { globals: globals.node },
  },

  {
    // CLI script: printing to the console is its output.
    files: ['apps/api/src/db/seed.ts'],
    rules: { 'no-console': 'off' },
  },

  {
    // Test doubles read untyped JSON (`res.json()` is `any` in light-my-request); test tables are long by design.
    files: TEST_FILES,
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      'max-lines': 'off',
    },
  },

  {
    files: ['**/*.js'],
    extends: [js.configs.recommended, tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },

  prettier,
);
