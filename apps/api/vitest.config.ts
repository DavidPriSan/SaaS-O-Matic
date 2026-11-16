import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // Process entry points (server boot, seed CLI) are exercised manually, not by unit/integration tests.
      exclude: ['src/**/*.test.ts', 'src/testing/**', 'src/server.ts', 'src/db/seed.ts'],
      reporter: ['text-summary', 'text'],
      // Measured baseline minus a small margin; remaining gaps are unreachable defensive branches.
      thresholds: { lines: 90, statements: 90, functions: 90, branches: 80 },
    },
  },
});
