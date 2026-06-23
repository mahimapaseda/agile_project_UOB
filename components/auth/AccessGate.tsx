'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/lib/auth-context';
import { auth } from '@/lib/firebase';
import { UserProfile } from '@/types';
import { PermissionDenied } from '@/components/auth/PermissionDenied';

interface AccessGateProps {
  children: React.ReactNode;
  allow: (profile: UserProfile) => boolean;
  redirectTo?: string;
  deniedMessage?: string;
  deniedTitle?: string;
  backLabel?: string;
}

export function AccessGate({
  children,
  allow,
  redirectTo = '/dashboard',
  deniedMessage = 'You do not have permission to view this page.',
  deniedTitle = 'Access denied',
  backLabel = 'Back to dashboard',
}: AccessGateProps) {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user && !userProfile) {
      void signOut(auth);
      router.replace('/login');
    }
  }, [loading, user, userProfile, router]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!userProfile) return null;

  if (!allow(userProfile)) {
    return (
      <PermissionDenied
        title={deniedTitle}
        message={deniedMessage}
        backHref={redirectTo}
        backLabel={backLabel}
      />
    );
  }

  return <>{children}</>;
}
