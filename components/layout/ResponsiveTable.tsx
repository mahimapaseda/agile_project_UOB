import { cn } from '@/lib/utils';

interface ResponsiveTableProps {
  children: React.ReactNode;
  className?: string;
  /** Show swipe hint below lg viewports */
  showHint?: boolean;
  hint?: string;
}

/**
 * Horizontal scroll wrapper for wide data tables on mobile and tablet.
 * Desktop (lg+) relies on parent panel scroll; hint is hidden there.
 */
export function ResponsiveTable({
  children,
  className,
  showHint = true,
  hint = 'Swipe horizontally to see all columns',
}: ResponsiveTableProps) {
  return (
    <div className={cn('table-scroll-shadow relative min-w-0 w-full max-w-full', className)}>
      <div className="table-scroll scroll-touch w-full max-w-full">{children}</div>
      {showHint && (
        <p className="px-2 py-1.5 text-center text-[10px] font-medium text-slate-400 lg:hidden">
          {hint}
        </p>
      )}
    </div>
  );
}
