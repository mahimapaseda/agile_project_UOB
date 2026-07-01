'use client';

import { Header } from '@/components/layout/Header';
import { PageMain } from '@/components/layout/PageMain';
import { StaffForm } from '@/components/staff/StaffForm';
import { AccessGate } from '@/components/auth/AccessGate';
import { canManageStaff } from '@/lib/access-control';

export default function NewStaffPage() {
  return (
    <AccessGate allow={canManageStaff} redirectTo="/dashboard/staff">
      <div className="flex min-h-0 flex-1 flex-col">
        <Header
          title="Add Staff"
          subtitle="Register a new academic or non-academic staff member"
        />
        <PageMain>
          <StaffForm />
        </PageMain>
      </div>
    </AccessGate>
  );
}
