import type { InfiniteData } from '@tanstack/react-query';
import type { Page } from '@saas/shared';

/** Typed so TanStack Query infers `string | null` as the page param (the first page has no cursor). */
export const FIRST_PAGE: string | null = null;

export const nextPageParam = <T>(last: Page<T>): string | null => last.nextCursor;

/** Components render one flat list; pages are an implementation detail of the cache. */
export const flattenPages = <T>(data: InfiniteData<Page<T>, string | null>): T[] =>
  data.pages.flatMap((page) => page.items);
