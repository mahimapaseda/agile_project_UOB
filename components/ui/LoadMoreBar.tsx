'use client';

import { Button } from '@/components/ui/button';

interface LoadMoreBarProps {
  visibleCount: number;
  total: number;
  onLoadMore: () => void;
}

export function LoadMoreBar({ visibleCount, total, onLoadMore }: LoadMoreBarProps) {
  if (visibleCount >= total) return null;

  return (
    <div className="flex flex-col items-center gap-1 border-t border-slate-100 px-4 py-4">
      <p className="text-xs text-slate-500">
        Showing {visibleCount.toLocaleString()} of {total.toLocaleString()}
      </p>
      <Button type="button" variant="outline" size="sm" onClick={onLoadMore}>
        Load more
      </Button>
    </div>
  );
}
