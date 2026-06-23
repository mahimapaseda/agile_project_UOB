/** Local display preferences — per device, all roles. */

export const FONT_SCALE_KEY = 'dbms-font-scale';
export const COMPACT_DENSITY_KEY = 'dbms-compact-density';
export const PREFERENCES_CHANGED_EVENT = 'dbms-preferences-changed';

export type FontScale = 'device' | 'small' | 'medium' | 'large' | 'xlarge';

export const FONT_SCALE_OPTIONS: {
  value: FontScale;
  label: string;
  description: string;
}[] = [
  {
    value: 'device',
    label: 'Follow device',
    description: 'Uses your phone or computer display font size (recommended).',
  },
  {
    value: 'small',
    label: 'Smaller',
    description: 'Slightly smaller text across the app.',
  },
  {
    value: 'medium',
    label: 'Default',
    description: 'Standard app text size on top of your device setting.',
  },
  {
    value: 'large',
    label: 'Larger',
    description: 'Easier to read on small screens.',
  },
  {
    value: 'xlarge',
    label: 'Extra large',
    description: 'Maximum text size for accessibility.',
  },
];

export const FONT_SCALE_MULTIPLIERS: Record<FontScale, number> = {
  device: 1,
  small: 0.875,
  medium: 1,
  large: 1.125,
  xlarge: 1.25,
};

export function readFontScale(): FontScale {
  if (typeof window === 'undefined') return 'device';
  try {
    const stored = localStorage.getItem(FONT_SCALE_KEY);
    if (stored && FONT_SCALE_OPTIONS.some((o) => o.value === stored)) {
      return stored as FontScale;
    }
  } catch {
    /* ignore */
  }
  return 'device';
}

export function readCompactDensity(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(COMPACT_DENSITY_KEY) === 'true';
  } catch {
    return false;
  }
}

export function applyDisplayPreferences(): void {
  if (typeof document === 'undefined') return;

  const fontScale = readFontScale();
  const compact = readCompactDensity();
  const root = document.documentElement;

  root.dataset.fontScale = fontScale;
  root.style.setProperty('--dbms-font-scale', String(FONT_SCALE_MULTIPLIERS[fontScale]));

  root.classList.toggle('dbms-compact', compact);
}

export function setFontScale(scale: FontScale): void {
  localStorage.setItem(FONT_SCALE_KEY, scale);
  applyDisplayPreferences();
  window.dispatchEvent(new Event(PREFERENCES_CHANGED_EVENT));
}

export function setCompactDensity(enabled: boolean): void {
  localStorage.setItem(COMPACT_DENSITY_KEY, String(enabled));
  applyDisplayPreferences();
  window.dispatchEvent(new Event(PREFERENCES_CHANGED_EVENT));
}
