'use client';

import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/lib/hooks/use-reduced-motion';

interface DirectorySkeletonProps {
  rows?: number;
  label?: string;
  className?: string;
}

/** Skeleton rows for directory list panels while Firestore data loads. */
export function DirectorySkeleton({
  rows = 8,
  label = 'Loading directory…',
  className,
}: DirectorySkeletonProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div
      className={cn('p-3 sm:p-4', className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">{label}</span>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-3 py-3 sm:px-4 sm:py-3.5"
          >
            <div
              className={cn(
                'h-10 w-10 shrink-0 rounded-xl bg-slate-200 sm:h-11 sm:w-11',
                !reducedMotion && 'animate-pulse',
              )}
            />
            <div className="min-w-0 flex-1 space-y-2">
              <div
                className={cn('h-3.5 w-[42%] rounded bg-slate-200', !reducedMotion && 'animate-pulse')}
              />
              <div
                className={cn('h-3 w-[28%] rounded bg-slate-100', !reducedMotion && 'animate-pulse')}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
