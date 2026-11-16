import { buildApp } from './app';
import { loadConfig } from './config';
import { openDatabase } from './db/connection';
import { runMigrations } from './db/migrate';

const config = loadConfig();
const db = openDatabase(config.DB_PATH);
const applied = runMigrations(db);

const app = await buildApp({ db, corsOrigin: config.CORS_ORIGIN, logger: { level: config.LOG_LEVEL } });
if (applied.length > 0) {
  app.log.info({ applied }, 'Database migrations applied');
}

async function shutdown(signal: string): Promise<void> {
  app.log.info({ signal }, 'Shutting down');
  await app.close();
  db.close();
  process.exit(0);
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));

try {
  await app.listen({ port: config.PORT, host: config.HOST });
} catch (error) {
  app.log.fatal(error, 'Failed to start server');
  db.close();
  process.exit(1);
}
