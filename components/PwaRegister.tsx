'use client';

import { useEffect } from 'react';
import { isStandaloneInstalledApp } from '@/lib/installed-app';

const LOCKED_VIEWPORT =
  'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';

/**
 * Registers the service worker in production.
 * Firebase/API traffic is never cached (see public/sw.js).
 */
export function PwaRegister() {
  useEffect(() => {
    let removeGestureListeners: (() => void) | undefined;

    if (isStandaloneInstalledApp()) {
      const meta = document.querySelector('meta[name="viewport"]');
      if (meta) meta.setAttribute('content', LOCKED_VIEWPORT);

      const blockPinch = (e: Event) => e.preventDefault();
      document.addEventListener('gesturestart', blockPinch, { passive: false });
      document.addEventListener('gesturechange', blockPinch, { passive: false });
      removeGestureListeners = () => {
        document.removeEventListener('gesturestart', blockPinch);
        document.removeEventListener('gesturechange', blockPinch);
      };
    }

    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((err) => console.warn('[PWA] Service worker registration failed:', err));
    }

    return () => removeGestureListeners?.();
  }, []);

  return null;
}
