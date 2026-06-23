'use client';

import { Header } from '@/components/layout/Header';
import { PageMain } from '@/components/layout/PageMain';
import { FirebaseAdminSetupBanner } from '@/components/admin/FirebaseAdminSetupBanner';
import { UserManagementDirectory } from '@/components/admin/UserManagementDirectory';
import { AccessGate } from '@/components/auth/AccessGate';
import { isAdmin } from '@/lib/access-control';

export default function AdminPage() {
  return (
    <AccessGate allow={isAdmin}>
      <div className="flex min-h-0 flex-1 flex-col">
        <Header
          title="User Management"
          subtitle="Link portal logins to staff and student records"
        />
        <PageMain flexContent className="min-h-0">
          <FirebaseAdminSetupBanner />
          <UserManagementDirectory />
        </PageMain>
      </div>
    </AccessGate>
  );
}
