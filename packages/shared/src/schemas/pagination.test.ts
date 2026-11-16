import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { encodeCursor, pageQuerySchema, pageResponseSchema } from './pagination';

describe('pageQuerySchema', () => {
  it('defaults limit to 20 and has no cursor on the first page', () => {
    expect(pageQuerySchema.parse({})).toEqual({ limit: 20 });
  });

  it('decodes a cursor produced by encodeCursor (round trip)', () => {
    const position = { createdAt: '2026-11-16T10:20:30.456Z', id: 42 };
    expect(pageQuerySchema.parse({ cursor: encodeCursor(position), limit: '5' })).toEqual({
      limit: 5,
      cursor: position,
    });
  });

  it.each([
    'abc',
    '2026-11-16T10:20:30.456Z',
    '2026-11-16T10:20:30.456Z_0',
    '2026-11-16T10:20:30.456Z_01',
    '2026-11-16T10:20:30Z_4',
    "2026-11-16T10:20:30.456Z_4' OR 1=1",
    `2026-11-16T10:20:30.456Z_${'9'.repeat(16)}`,
  ])('rejects the malformed cursor %j', (cursor) => {
    expect(pageQuerySchema.safeParse({ cursor }).success).toBe(false);
  });

  it('rejects limits out of 1–50', () => {
    expect(pageQuerySchema.safeParse({ limit: '0' }).success).toBe(false);
    expect(pageQuerySchema.safeParse({ limit: '51' }).success).toBe(false);
  });
});

describe('pageResponseSchema', () => {
  it('requires nextCursor (null when there are no more items)', () => {
    const schema = pageResponseSchema(z.number());
    expect(schema.parse({ items: [1], nextCursor: null })).toEqual({ items: [1], nextCursor: null });
    expect(schema.safeParse({ items: [1] }).success).toBe(false);
  });
});
