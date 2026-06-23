'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

interface SchoolLogoProps {
  /** Use on blue/dark backgrounds — stronger shadow for contrast */
  variant?: 'dark' | 'light';
  size?: number;
  className?: string;
}

/**
 * School emblem on a white tile so the PNG's black matte and full colors read clearly
 * on both dark (sidebar, login) and light UI surfaces.
 */
export function SchoolLogo({ variant = 'light', size = 40, className }: SchoolLogoProps) {
  const pad = Math.max(4, Math.round(size * 0.12));

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-xl bg-white',
        variant === 'dark'
          ? 'shadow-md ring-1 ring-white/40'
          : 'shadow-sm ring-1 ring-slate-200/90',
        className,
      )}
      style={{ padding: pad }}
    >
      <Image
        src="/school-logo.png"
        alt="Delta Gemunupura College"
        width={size}
        height={size}
        className="object-contain"
        style={{ width: size, height: size }}
        priority
      />
    </span>
  );
}
