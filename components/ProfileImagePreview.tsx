'use client';

import { useEffect, useState } from 'react';
import { Camera } from 'lucide-react';
import { resolveProfileImageUrl } from '@/lib/resolve-profile-image-url';
import { cn } from '@/lib/utils';

interface ProfileImagePreviewProps {
  src?: string | null;
  alt: string;
  initials?: string;
  imageClassName?: string;
  fallbackClassName?: string;
}

export function ProfileImagePreview({
  src,
  alt,
  initials,
  imageClassName,
  fallbackClassName,
}: ProfileImagePreviewProps) {
  const [failed, setFailed] = useState(false);
  const resolved =
    src?.startsWith('blob:') || src?.startsWith('data:image/')
      ? src
      : resolveProfileImageUrl(src);

  useEffect(() => {
    setFailed(false);
  }, [resolved]);

  if (resolved && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={resolved.slice(0, 96)}
        src={resolved}
        alt={alt}
        className={imageClassName}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div className={cn(fallbackClassName, imageClassName)}>
      {initials && initials !== '?' ? initials : <Camera className="h-7 w-7 opacity-50" />}
    </div>
  );
}

export function isProfileImageDataUrl(value?: string | null): boolean {
  return !!value?.trim().startsWith('data:image/');
}
