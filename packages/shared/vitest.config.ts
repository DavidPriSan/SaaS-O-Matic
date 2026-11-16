import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts'],
      reporter: ['text-summary', 'text'],
      // Pure domain logic (pricing, fiscal IDs): the bar is high on purpose.
      thresholds: { lines: 95, statements: 95, functions: 95, branches: 95 },
    },
  },
});
