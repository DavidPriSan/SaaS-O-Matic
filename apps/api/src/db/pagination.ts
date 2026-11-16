import { encodeCursor, type CursorPosition, type Page } from '@saas/shared';

/** Named parameters for the keyset condition `(created_at, id) < (@cursorCreatedAt, @cursorId)`. */
export interface CursorParams {
  cursorCreatedAt: string | null;
  cursorId: number | null;
  /** One more than the page size: tells whether a next page exists without a COUNT query. */
  fetchLimit: number;
}

export const KEYSET_CONDITION = '(@cursorCreatedAt IS NULL OR (created_at, id) < (@cursorCreatedAt, @cursorId))';

export function cursorParams(limit: number, cursor: CursorPosition | undefined): CursorParams {
  return { cursorCreatedAt: cursor?.createdAt ?? null, cursorId: cursor?.id ?? null, fetchLimit: limit + 1 };
}

interface KeysetRow {
  id: number;
  created_at: string;
}

export function toPage<Row extends KeysetRow, Item>(rows: Row[], limit: number, map: (row: Row) => Item): Page<Item> {
  const pageRows = rows.slice(0, limit);
  const last = pageRows.at(-1);
  return {
    items: pageRows.map(map),
    nextCursor: rows.length > limit && last ? encodeCursor({ createdAt: last.created_at, id: last.id }) : null,
  };
}
