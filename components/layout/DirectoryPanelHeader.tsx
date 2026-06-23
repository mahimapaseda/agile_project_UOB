import { cn } from '@/lib/utils';

interface DirectoryPanelHeaderProps {
  title: string;
  count?: number;
  countLabel?: string;
  loading?: boolean;
  className?: string;
  scrollHint?: boolean;
}

export function DirectoryPanelHeader({
  title,
  count,
  countLabel = 'result',
  loading,
  className,
  scrollHint = true,
}: DirectoryPanelHeaderProps) {
  const countText =
    count === undefined
      ? null
      : loading
        ? '…'
        : `${count} ${countLabel}${count !== 1 ? 's' : ''}`;

  return (
    <div
      className={cn(
        'surface-header sticky top-0 z-[1] flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 sm:px-4 sm:py-2.5 lg:static',
        className,
      )}
    >
      <p className="min-w-0 truncate text-sm font-bold text-slate-900">
        {title}
        {countText !== null && (
          <span className="ml-2 font-normal text-slate-500">{countText}</span>
        )}
      </p>
      {scrollHint && !loading && count !== undefined && count > 0 && (
        <p className="shrink-0 text-[10px] font-medium text-slate-400 lg:hidden">
          Scroll for more
        </p>
      )}
    </div>
  );
}
