'use client';

import { Header } from '@/components/layout/Header';
import { PageMain } from '@/components/layout/PageMain';
import { StudentForm } from '@/components/students/StudentForm';
import { AccessGate } from '@/components/auth/AccessGate';
import { canManageStudents } from '@/lib/access-control';

export default function NewStudentPage() {
  return (
    <AccessGate allow={canManageStudents} redirectTo="/dashboard/students">
      <div className="flex min-h-0 flex-1 flex-col">
        <Header
          title="Add Student"
          subtitle="Register a new student — same fields as the Google Form / CSV import"
        />
        <PageMain>
          <StudentForm />
        </PageMain>
      </div>
    </AccessGate>
  );
}
