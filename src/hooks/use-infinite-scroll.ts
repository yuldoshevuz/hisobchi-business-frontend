import { useEffect, useMemo, useRef } from 'react';

interface InfiniteScrollOptions {
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
  fetchNextPage: () => unknown;
  /**
   * How early to trigger before the sentinel enters the viewport. Default
   * `200px` so the next page request is already in-flight by the time the
   * user reaches the end, removing the loading-flash.
   */
  rootMargin?: string;
}

/**
 * Bridges react-query's `useInfiniteQuery` to a sentinel-driven
 * `IntersectionObserver`. Pass the relevant fields from the query result —
 * `fetchNextPage` is stable in react-query v5 so re-renders won't churn the
 * observer; while a fetch is in flight the observer is detached entirely so
 * a single visibility transition cannot trigger duplicate fetches.
 */
export function useInfiniteScroll({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  rootMargin = '200px',
}: InfiniteScrollOptions): React.RefObject<HTMLDivElement | null> {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) fetchNextPage();
      },
      { rootMargin, threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, rootMargin]);

  return sentinelRef;
}

/**
 * Computes how many list items should fit on the user's viewport (plus a
 * buffer) so the initial page completely fills the screen — no empty white
 * space below short responses.
 */
export function useViewportPageSize(
  itemHeight: number,
  options: { buffer?: number; min?: number; max?: number } = {},
): number {
  const { buffer = 5, min = 10, max = 100 } = options;
  return useMemo(() => {
    if (typeof window === 'undefined') return min;
    const viewport = window.innerHeight || 0;
    if (viewport <= 0) return min;
    const itemsPerScreen = Math.ceil(viewport / itemHeight);
    const total = itemsPerScreen + buffer;
    return Math.min(max, Math.max(min, total));
  }, [itemHeight, buffer, min, max]);
}
