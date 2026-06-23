'use client';

export const dynamic = 'force-dynamic';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ClientOnly } from '@/components/ClientOnly';
import { AppWelcomeBranding } from '@/components/AppWelcomeBranding';
import { useAuth } from '@/lib/auth-context';

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      router.replace(user ? '/dashboard' : '/login');
    }
  }, [user, loading, router]);

  return (
    <ClientOnly>
      <div className="flex min-h-dvh items-center justify-center bg-slate-50">
        <AppWelcomeBranding variant="light" logoSize={88} showSpinner />
      </div>
    </ClientOnly>
  );
}
