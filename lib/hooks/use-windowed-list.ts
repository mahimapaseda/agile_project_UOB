'use client';

import { useCallback, useEffect, useState } from 'react';

const DEFAULT_PAGE_SIZE = 80;

/** Renders large lists incrementally to limit DOM size. */
export function useWindowedList<T>(items: T[], pageSize = DEFAULT_PAGE_SIZE) {
  const [visibleCount, setVisibleCount] = useState(pageSize);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [items, pageSize]);

  const visible = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  const loadMore = useCallback(() => {
    setVisibleCount((c) => Math.min(c + pageSize, items.length));
  }, [items.length, pageSize]);

  return { visible, hasMore, loadMore, total: items.length, visibleCount };
}
