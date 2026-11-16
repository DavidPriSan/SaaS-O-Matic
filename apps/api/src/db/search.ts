import type { Db } from './connection';

/** Lowercase + strip diacritics, so "NÉBULA", "nébula" and "nebula" compare equal. */
export function normalizeSearchText(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/**
 * SQLite's LIKE only case-folds ASCII, so non-ASCII names (é, ñ…) would not match case-insensitively.
 * Exposes the same normalization to SQL as `search_normalize(text)`.
 */
export function registerSearchFunctions(db: Db): void {
  db.function('search_normalize', { deterministic: true }, (value: unknown) =>
    typeof value === 'string' ? normalizeSearchText(value) : value,
  );
}
