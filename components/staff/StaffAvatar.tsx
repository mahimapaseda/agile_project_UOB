'use client';

import { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolveProfileImageUrl } from '@/lib/resolve-profile-image-url';

interface StaffAvatarProps {
  name: string;
  profileImageUrl?: string | null;
  size?: 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  md: 'h-11 w-11 rounded-xl text-sm',
  lg: 'h-16 w-16 rounded-xl text-lg sm:h-20 sm:w-20 sm:text-2xl',
};

export function StaffAvatar({
  name,
  profileImageUrl,
  size = 'md',
  className,
}: StaffAvatarProps) {
  const [failed, setFailed] = useState(false);
  const src = resolveProfileImageUrl(profileImageUrl);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const box = cn(
    'flex shrink-0 items-center justify-center overflow-hidden bg-emerald-100 font-bold text-emerald-800 ring-2 ring-emerald-50',
    sizeClasses[size],
    className,
  );

  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={src.slice(0, 96)}
        src={src}
        alt={`${name} profile`}
        className={cn(box, 'object-cover ring-emerald-100')}
        onError={() => setFailed(true)}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div className={box} aria-hidden>
      {initials || <User className={size === 'lg' ? 'h-8 w-8' : 'h-5 w-5'} />}
    </div>
  );
}
