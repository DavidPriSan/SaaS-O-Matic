import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { z } from 'zod';

// Env is external input (CLAUDE.md). The E2E run points the proxy at its own API instance.
const API_TARGET = z.url().default('http://localhost:3000').parse(process.env.API_TARGET);

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    // The browser only ever talks to /api: no absolute URLs in the app, no CORS in development (ADR-006).
    proxy: {
      '/api': {
        target: API_TARGET,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  // `vite preview` (production build, used by E2E) inherits server.proxy; strictPort is set per command.
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Dates render in the viewer's zone; pin one so tests give the same result locally (CET) and in CI (UTC).
    env: { TZ: 'Europe/Madrid' },
    // Report only (no threshold): UI tests target user flows rather than line counts.
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx'],
      reporter: ['text-summary'],
    },
  },
});
