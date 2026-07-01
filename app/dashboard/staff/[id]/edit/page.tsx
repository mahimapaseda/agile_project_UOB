'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { PageMain } from '@/components/layout/PageMain';
import { StaffForm } from '@/components/staff/StaffForm';
import { AccessGate } from '@/components/auth/AccessGate';
import { canManageStaff } from '@/lib/access-control';
import { getStaff } from '@/lib/firestore';
import { Staff } from '@/types';

function EditStaffPageContent() {
  const { id } = useParams<{ id: string }>();
  const [staff, setStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const s = await getStaff(id);
        if (!cancelled) setStaff(s);
      } catch {
        if (!cancelled) setStaff(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <Header title="Edit Staff" />
        <PageMain className="flex items-center justify-center">
          <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-emerald-600 border-t-transparent" />
        </PageMain>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Header
        title="Edit Staff"
        subtitle={staff?.name}
        backHref={staff ? `/dashboard/staff/${staff.id}` : '/dashboard/staff'}
        backLabel="Back to staff profile"
      />
      <PageMain>
        {staff ? (
          <StaffForm staff={staff} isEdit />
        ) : (
          <p className="text-slate-500">Staff member not found.</p>
        )}
      </PageMain>
    </div>
  );
}

export default function EditStaffPage() {
  return (
    <AccessGate allow={canManageStaff} redirectTo="/dashboard/staff">
      <EditStaffPageContent />
    </AccessGate>
  );
}
