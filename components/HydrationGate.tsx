'use client';

import { useSyncExternalStore } from 'react';
import { AppWelcomeBranding } from '@/components/AppWelcomeBranding';

function subscribe() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

/**
 * Defers app UI until after hydration. Shows school welcome branding while waiting.
 */
export function HydrationGate({ children }: { children: React.ReactNode }) {
  const ready = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  if (!ready) {
    return (
      <div
        className="flex min-h-dvh items-center justify-center bg-slate-50"
        suppressHydrationWarning
        aria-busy="true"
        aria-label="Loading application"
      >
        <AppWelcomeBranding variant="light" logoSize={100} showSpinner />
      </div>
    );
  }

  return <>{children}</>;
}
