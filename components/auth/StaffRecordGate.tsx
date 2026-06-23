'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getStaff } from '@/lib/firestore';
import { canViewStaffRecord } from '@/lib/access-control';
import { formatFirestoreError } from '@/lib/firestore-errors';
import { PermissionDenied } from '@/components/auth/PermissionDenied';
import { Staff } from '@/types';

interface StaffRecordGateProps {
  staffId: string;
  children: (staff: Staff) => React.ReactNode;
  redirectTo?: string;
}

export function StaffRecordGate({
  staffId,
  children,
  redirectTo = '/dashboard/staff',
}: StaffRecordGateProps) {
  const { userProfile, loading: authLoading } = useAuth();
  const [staff, setStaff] = useState<Staff | null>(null);
  const [denied, setDenied] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !userProfile) return;

    let cancelled = false;
    setLoading(true);
    setDenied(false);
    setLoadError(null);

    (async () => {
      try {
        const s = await getStaff(staffId);
        if (cancelled) return;

        if (!s) {
          setStaff(null);
          return;
        }

        if (!canViewStaffRecord(userProfile, s)) {
          setDenied(true);
          setStaff(null);
          return;
        }

        setStaff(s);
      } catch (err) {
        if (!cancelled) {
          setLoadError(formatFirestoreError(err));
          setStaff(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [staffId, userProfile, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  if (denied) {
    return (
      <PermissionDenied
        message="You do not have permission to view this staff record."
        backHref={redirectTo}
        backLabel="Back to staff"
      />
    );
  }

  if (loadError) {
    return (
      <PermissionDenied
        title="Could not load staff record"
        message={loadError}
        backHref={redirectTo}
        backLabel="Back to staff"
      />
    );
  }

  if (!staff) {
    return (
      <PermissionDenied
        title="Staff member not found"
        message="This record may have been removed or you may not have access."
        backHref={redirectTo}
        backLabel="Back to staff"
      />
    );
  }

  return <>{children(staff)}</>;
}
