import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const API_TARGET = 'http://localhost:3000';

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
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
