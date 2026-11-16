import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

// Own ports, so the E2E run never reuses (or collides with) `npm run dev` on 3000/5173.
const API_PORT = 3100;
const WEB_PORT = 4173;
const TMP_DIR = fileURLToPath(new URL('./.tmp', import.meta.url));

// Fresh seeded database on every run. Workers re-evaluate this file: only the main process may reset it.
if (process.env.TEST_WORKER_INDEX === undefined) rmSync(TMP_DIR, { recursive: true, force: true });

export default defineConfig({
  testDir: './tests',
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'mobile-390', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } } },
    { name: 'desktop-1440', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: [
    {
      // Real API + SQLite file (not mocked): the same code path as production.
      command: 'npm run seed -w @saas/api && npm run start -w @saas/api',
      cwd: '..',
      env: { PORT: String(API_PORT), DB_PATH: `${TMP_DIR}/e2e.db`, LOG_LEVEL: 'warn' },
      url: `http://localhost:${API_PORT}/health`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      // Production build (what users get), served by `vite preview` with the same /api proxy as dev.
      command: `npm run build -w @saas/web && npm run preview -w @saas/web -- --port ${WEB_PORT} --strictPort`,
      cwd: '..',
      env: { API_TARGET: `http://localhost:${API_PORT}` },
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
