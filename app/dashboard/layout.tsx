'use client';

export const dynamic = 'force-dynamic';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ClientOnly } from '@/components/ClientOnly';
import { useAuth } from '@/lib/auth-context';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { MobileNavProvider } from '@/components/layout/mobile-nav';
import { AppWelcomeBranding } from '@/components/AppWelcomeBranding';
import { BiometricUnlockGate } from '@/components/auth/BiometricUnlockGate';
import { MustChangePasswordScreen } from '@/components/auth/MustChangePasswordScreen';

function LoadingScreen() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50">
      <AppWelcomeBranding variant="light" logoSize={88} showSpinner />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <ClientOnly>
        <LoadingScreen />
      </ClientOnly>
    );
  }

  if (!user) return null;

  if (userProfile?.accountType === 'student' && userProfile.mustChangePassword) {
    return (
      <ClientOnly>
        <MustChangePasswordScreen />
      </ClientOnly>
    );
  }

  return (
    <BiometricUnlockGate>
      <MobileNavProvider>
        <div className="flex min-h-dvh bg-slate-100">
          <Sidebar />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {children}
          </div>
          <BottomNav />
        </div>
      </MobileNavProvider>
    </BiometricUnlockGate>
  );
}
