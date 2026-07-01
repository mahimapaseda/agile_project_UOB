'use client';

import { useParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { PageMain } from '@/components/layout/PageMain';
import { StaffRecordGate } from '@/components/auth/StaffRecordGate';
import { Staff } from '@/types';
import { canManageStaff, canViewFullStaffProfile } from '@/lib/access-control';
import { isOwnStaffRecord } from '@/lib/linked-records';
import { useAuth } from '@/lib/auth-context';
import { StaffProfileDetails } from '@/components/staff/StaffProfileDetails';

function StaffDetailContent({ staff, staffId }: { staff: Staff; staffId: string }) {
  const { userProfile } = useAuth();
  const canManage = canManageStaff(userProfile);
  const fullProfile = canViewFullStaffProfile(userProfile);
  const viewingOwn = isOwnStaffRecord(userProfile, staff);
  const backHref = viewingOwn ? '/dashboard' : '/dashboard/staff';

  const handleExport = async () => {
    const { exportStaffProfilePDF, exportStaffProfilePDFLimited } = await import('@/lib/pdf-export');
    await (fullProfile ? exportStaffProfilePDF(staff) : exportStaffProfilePDFLimited(staff));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Header
        title={viewingOwn ? 'My Profile' : 'Staff Profile'}
        subtitle={staff.staffId}
        backHref={backHref}
        backLabel={viewingOwn ? 'Back to dashboard' : 'Back to staff'}
      />
      <PageMain>
        <StaffProfileDetails
          staff={staff}
          staffId={staffId}
          canManage={canManage}
          limitedView={!fullProfile}
          onExport={handleExport}
          backHref={backHref}
        />
      </PageMain>
    </div>
  );
}

export default function StaffDetailPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <StaffRecordGate staffId={id}>
      {(staff) => <StaffDetailContent staff={staff} staffId={id} />}
    </StaffRecordGate>
  );
}
