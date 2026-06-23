'use client';

import { useEffect } from 'react';
import { isStandaloneInstalledApp } from '@/lib/installed-app';

/**
 * Keeps the installed PWA in portrait when the device allows it.
 * No blocking overlay is shown.
 */
export function PortraitOrientationGuard() {
  useEffect(() => {
    if (!isStandaloneInstalledApp()) return;

    const lockPortrait = async () => {
      try {
        const orientation = screen.orientation;
        if (orientation && 'lock' in orientation && typeof orientation.lock === 'function') {
          await orientation.lock('portrait-primary');
        }
      } catch {
        /* Manifest / OS may already lock orientation, or lock not permitted */
      }
    };

    void lockPortrait();

    const onVisible = () => {
      if (document.visibilityState === 'visible') void lockPortrait();
    };
    const onResize = () => void lockPortrait();
    const orientation = screen.orientation;

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('resize', onResize);
    if (orientation && 'addEventListener' in orientation) {
      orientation.addEventListener('change', onResize);
    }

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('resize', onResize);
      if (orientation && 'removeEventListener' in orientation) {
        orientation.removeEventListener('change', onResize);
      }
    };
  }, []);

  return null;
}
