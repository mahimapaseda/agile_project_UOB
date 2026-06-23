'use client';

import { useEffect, useState } from 'react';

/** Renders children only after mount (e.g. auth loading UI). Root layout uses HydrationGate for SSR safety. */
export function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return <>{children}</>;
}
