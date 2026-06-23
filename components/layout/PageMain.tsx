import { cn } from '@/lib/utils';

interface PageMainProps {
  children: React.ReactNode;
  className?: string;
  /** Use on pages that manage their own inner scroll (e.g. split panels). */
  noScroll?: boolean;
  /** Disable max-width container (e.g. full-bleed directory tables). */
  fullBleed?: boolean;
  /** Stretch inner container for flex column layouts (directories). */
  flexContent?: boolean;
}

/**
 * Standard dashboard content area with responsive padding, safe areas,
 * bottom-nav clearance on mobile, and optional max-width on large desktops.
 */
export function PageMain({ children, className, noScroll, fullBleed, flexContent }: PageMainProps) {
  return (
    <main
      className={cn(
        'flex-1 min-h-0 page-bg',
        !noScroll && 'overflow-y-auto overflow-x-hidden scroll-touch',
        'p-3 xs:p-4 sm:p-5 md:p-6 lg:p-8',
        'pb-bottom-nav lg:pb-[max(1.5rem,var(--safe-bottom))]',
        className,
      )}
    >
      {fullBleed ? (
        children
      ) : (
        <div
          className={cn(
            'content-container w-full min-w-0',
            flexContent && 'flex flex-col lg:min-h-0 lg:flex-1',
          )}
        >
          {children}
        </div>
      )}
    </main>
  );
}
