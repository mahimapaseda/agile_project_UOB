'use client';

import { useServerInsertedHTML } from 'next/navigation';

/**
 * Injects pre-hydrate.js at the start of <body> (not <head>) so browser extensions
 * that inject head scripts do not cause hydration mismatches. Includes iOS 15 polyfills
 * and strips extension attributes before React hydrates.
 */
export function PreHydrateScript() {
  useServerInsertedHTML(() => (
    // eslint-disable-next-line @next/next/no-sync-scripts
    <script src="/pre-hydrate.js" suppressHydrationWarning />
  ));

  return null;
}
