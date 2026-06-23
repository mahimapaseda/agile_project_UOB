/**
 * Solid fills for stat / section icon badges.
 * Tailwind v4 gradient backgrounds + white Lucide icons fail on iOS 15 Safari.
 */
export const GRADIENT_TO_SOLID: Record<string, string> = {
  'from-blue-600 to-blue-800': 'bg-blue-600',
  'from-blue-500 to-blue-700': 'bg-blue-600',
  'from-emerald-500 to-emerald-700': 'bg-emerald-600',
  'from-emerald-600 to-emerald-800': 'bg-emerald-700',
  'from-green-500 to-green-700': 'bg-green-600',
  'from-violet-500 to-violet-700': 'bg-violet-600',
  'from-violet-600 to-violet-800': 'bg-violet-700',
  'from-violet-600 to-purple-800': 'bg-violet-700',
  'from-purple-500 to-purple-700': 'bg-purple-600',
  'from-purple-500 to-fuchsia-700': 'bg-purple-600',
  'from-indigo-500 to-indigo-700': 'bg-indigo-600',
  'from-fuchsia-500 to-fuchsia-700': 'bg-fuchsia-600',
  'from-amber-500 to-amber-600': 'bg-amber-500',
  'from-amber-400 to-amber-600': 'bg-amber-500',
  'from-amber-500 to-orange-600': 'bg-amber-500',
  'from-rose-500 to-rose-700': 'bg-rose-600',
  'from-rose-500 to-red-700': 'bg-rose-600',
  'from-sky-500 to-sky-700': 'bg-sky-600',
  'from-teal-500 to-teal-700': 'bg-teal-600',
  'from-emerald-500 to-green-700': 'bg-emerald-600',
};

export const ACCENT_SOLID_BY_NAME: Record<string, string> = {
  blue: 'bg-blue-600',
  indigo: 'bg-indigo-600',
  emerald: 'bg-emerald-600',
  violet: 'bg-violet-600',
  amber: 'bg-amber-500',
  rose: 'bg-rose-600',
  sky: 'bg-sky-600',
};

export function solidAccentFromGradient(accent: string): string {
  return GRADIENT_TO_SOLID[accent] ?? 'bg-slate-600';
}

export function solidAccentFromName(name: string): string {
  return ACCENT_SOLID_BY_NAME[name] ?? 'bg-slate-600';
}

/** Thin top/side accent bars — avoid Tailwind gradient utilities on iOS 15. */
export const GRADIENT_TO_ACCENT_BAR: Record<string, string> = {
  'from-teal-500 to-teal-700': 'accent-bar-teal',
  'from-emerald-500 to-emerald-700': 'accent-bar-emerald',
  'from-violet-500 to-violet-700': 'accent-bar-violet',
  'from-amber-500 to-amber-600': 'accent-bar-amber',
  'from-violet-600 to-violet-800': 'accent-bar-violet',
  'from-purple-500 to-purple-700': 'accent-bar-purple',
  'from-indigo-500 to-indigo-700': 'accent-bar-indigo',
  'from-fuchsia-500 to-fuchsia-700': 'accent-bar-fuchsia',
  'from-blue-600 to-blue-800': 'accent-bar-blue',
  'from-emerald-600 to-emerald-800': 'accent-bar-emerald',
  'from-emerald-500 to-green-700': 'accent-bar-emerald',
  'from-amber-500 to-orange-600': 'accent-bar-amber',
  'from-rose-500 to-red-700': 'accent-bar-rose',
  'from-sky-500 to-sky-700': 'accent-bar-sky',
  'from-red-500 to-red-700': 'accent-bar-rose',
  'from-slate-500 to-slate-600': 'accent-bar-slate',
};

export function accentBarFromGradient(accent: string): string {
  return GRADIENT_TO_ACCENT_BAR[accent] ?? 'accent-bar-violet';
}
