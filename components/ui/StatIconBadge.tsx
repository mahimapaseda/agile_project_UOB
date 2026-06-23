import { cn } from '@/lib/utils';
import { solidAccentFromGradient, solidAccentFromName } from '@/lib/stat-icon-accent';

type StatIconBadgeSize = 'xs' | 'sm' | 'md';

const SIZE_CLASSES: Record<StatIconBadgeSize, { box: string; icon: string }> = {
  xs: { box: 'h-7 w-7 rounded-lg', icon: 'h-3.5 w-3.5' },
  sm: { box: 'h-9 w-9 rounded-lg', icon: 'h-4 w-4' },
  md: { box: 'h-10 w-10 rounded-xl sm:h-12 sm:w-12', icon: 'h-5 w-5 sm:h-6 sm:w-6' },
};

export function StatIconBadge({
  icon: Icon,
  accent,
  tone,
  size = 'sm',
  className,
}: {
  icon: React.ElementType;
  /** Legacy gradient accent string, e.g. `from-blue-600 to-blue-800`. */
  accent?: string;
  /** Named accent key used in forms and profile sections. */
  tone?: string;
  size?: StatIconBadgeSize;
  className?: string;
}) {
  const sizes = SIZE_CLASSES[size];
  const solidClass = tone ? solidAccentFromName(tone) : solidAccentFromGradient(accent ?? '');

  return (
    <span
      className={cn(
        'stat-icon-badge flex shrink-0 items-center justify-center text-white shadow-sm',
        sizes.box,
        solidClass,
        className,
      )}
    >
      <Icon className={cn('stat-icon-badge__svg shrink-0', sizes.icon)} strokeWidth={2} aria-hidden />
    </span>
  );
}
