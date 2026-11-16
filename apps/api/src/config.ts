import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const DEFAULT_DB_PATH = fileURLToPath(new URL('../data/saas-o-matic.db', import.meta.url));

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().min(1).default('localhost'),
  DB_PATH: z.string().min(1).default(DEFAULT_DB_PATH),
  CORS_ORIGIN: z.url().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return envSchema.parse(env);
}
