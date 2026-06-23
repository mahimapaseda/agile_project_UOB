import { SchoolLogo } from '@/components/SchoolLogo';
import { cn } from '@/lib/utils';

type Variant = 'light' | 'dark';

interface AppWelcomeBrandingProps {
  /** light = slate text on pale bg; dark = white text on brand gradient */
  variant?: Variant;
  /** Logo tile size in px */
  logoSize?: number;
  showSpinner?: boolean;
  className?: string;
}

export function AppWelcomeBranding({
  variant = 'light',
  logoSize = 96,
  showSpinner = false,
  className,
}: AppWelcomeBrandingProps) {
  const dark = variant === 'dark';

  return (
    <div className={cn('flex flex-col items-center px-2 text-center sm:px-4', className)}>
      <SchoolLogo
        variant={dark ? 'dark' : 'light'}
        size={logoSize}
        className={cn(
          'mb-3 rounded-2xl shadow-lg sm:mb-5 md:mb-6',
          dark && 'shadow-xl ring-1 ring-white/30',
        )}
      />

      <p
        className={cn(
          'text-xs font-medium sm:text-sm',
          dark ? 'text-blue-200/90' : 'text-slate-500',
        )}
      >
        welcome
      </p>
      <p
        className={cn(
          'mt-1.5 max-w-[16rem] text-base font-bold leading-snug text-balance sm:mt-2 sm:max-w-[18rem] sm:text-lg md:text-xl',
          dark ? 'text-white' : 'text-slate-800',
        )}
      >
        Delta Gemunupura College
      </p>
      <p
        className={cn(
          'mt-0.5 text-xl font-extrabold tracking-tight sm:mt-1 sm:text-2xl md:text-3xl',
          dark ? 'text-accent-400' : 'text-brand-800',
        )}
      >
        DBMS
      </p>

      {showSpinner ? (
        <div
          className={cn(
            'mt-6 h-8 w-8 animate-spin rounded-full border-[3px]',
            dark ? 'border-accent-400/30 border-t-accent-400' : 'border-brand-200 border-t-brand-700',
          )}
          role="status"
          aria-label="Loading"
        />
      ) : null}
    </div>
  );
}
