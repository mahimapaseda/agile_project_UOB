'use client';

import { useState } from 'react';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolveProfileImageUrl } from '@/lib/resolve-profile-image-url';

interface StudentProfilePhotoProps {
  name: string;
  profileImageUrl?: string | null;
  size?: 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  md: 'w-12 h-12 sm:w-16 sm:h-16 rounded-xl text-lg sm:text-2xl',
  lg: 'w-28 h-28 sm:w-36 sm:h-36 rounded-2xl text-3xl',
};

export function StudentProfilePhoto({
  name,
  profileImageUrl,
  size = 'md',
  className,
}: StudentProfilePhotoProps) {
  const [failed, setFailed] = useState(false);
  const src = resolveProfileImageUrl(profileImageUrl);
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const box = cn(
    'flex-shrink-0 overflow-hidden bg-blue-100 flex items-center justify-center font-bold text-blue-700 ring-2 ring-blue-50',
    sizeClasses[size],
    className
  );

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={`${name} profile`}
        className={cn(box, 'object-cover ring-blue-100')}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div className={box} aria-hidden>
      {initials || <User className={size === 'lg' ? 'w-10 h-10' : 'w-6 h-6'} />}
    </div>
  );
}
