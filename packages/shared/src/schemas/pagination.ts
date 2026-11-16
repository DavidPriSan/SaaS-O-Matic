import { z } from 'zod';

export const PAGE_SIZE_DEFAULT = 20;
export const PAGE_SIZE_MAX = 50;

/** Position of the last item of a page in a `createdAt DESC, id DESC` listing (keyset pagination). */
export interface CursorPosition {
  createdAt: string;
  id: number;
}

// `createdAt` is always the ISO format SQLite stores (millisecond precision, UTC); ids are canonical.
const CURSOR_PATTERN = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)_([1-9]\d{0,14})$/;

/** Opaque to clients: they send back `nextCursor` as received and never build one. */
export function encodeCursor({ createdAt, id }: CursorPosition): string {
  return `${createdAt}_${id}`;
}

const cursorSchema = z.string().transform((value, ctx): CursorPosition => {
  const match = CURSOR_PATTERN.exec(value);
  if (!match?.[1] || !match[2]) {
    ctx.addIssue({ code: 'custom', message: 'INVALID_CURSOR' });
    return z.NEVER;
  }
  return { createdAt: match[1], id: Number(match[2]) };
});

/** `?limit=&cursor=` shared by every listing (spec 03, "Paginación"). */
export const pageQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(PAGE_SIZE_MAX).default(PAGE_SIZE_DEFAULT),
  cursor: cursorSchema.optional(),
});

export type PageQuery = z.infer<typeof pageQuerySchema>;

export function pageResponseSchema<T extends z.ZodType>(item: T) {
  return z.object({ items: z.array(item), nextCursor: z.string().nullable() });
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}
