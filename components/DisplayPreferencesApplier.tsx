'use client';

import { useEffect } from 'react';
import { applyDisplayPreferences, PREFERENCES_CHANGED_EVENT } from '@/lib/display-preferences';

/** Applies saved display preferences (font scale, compact layout) on every route. */
export function DisplayPreferencesApplier() {
  useEffect(() => {
    applyDisplayPreferences();
    const onChange = () => applyDisplayPreferences();
    window.addEventListener(PREFERENCES_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(PREFERENCES_CHANGED_EVENT, onChange);
  }, []);

  return null;
}
