import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Db } from './connection';

const MIGRATIONS_DIR = fileURLToPath(new URL('./migrations', import.meta.url));
const MIGRATION_FILE = /^\d{3}_[\w-]+\.sql$/;

/** Applies pending `NNN_name.sql` files in order, each one atomically. Returns the applied versions. */
export function runMigrations(db: Db, dir: string = MIGRATIONS_DIR): string[] {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version    TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )`);

  const applied = new Set(
    db.prepare<[], { version: string }>('SELECT version FROM schema_migrations').all().map((row) => row.version),
  );
  const pending = readdirSync(dir)
    .filter((file) => MIGRATION_FILE.test(file) && !applied.has(file))
    .sort();

  const record = db.prepare<[string]>('INSERT INTO schema_migrations (version) VALUES (?)');
  for (const file of pending) {
    db.transaction(() => {
      db.exec(readFileSync(join(dir, file), 'utf8'));
      record.run(file);
    })();
  }
  return pending;
}
