'use client';

import { AccessGate } from '@/components/auth/AccessGate';
import { isAdmin } from '@/lib/access-control';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AccessGate allow={isAdmin}>{children}</AccessGate>;
}
