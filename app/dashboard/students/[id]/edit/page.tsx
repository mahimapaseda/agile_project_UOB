'use client';

import { useParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { PageMain } from '@/components/layout/PageMain';
import { AccessGate } from '@/components/auth/AccessGate';
import { StudentRecordGate } from '@/components/auth/StudentRecordGate';
import { StudentForm } from '@/components/students/StudentForm';
import { canManageStudents } from '@/lib/access-control';
import { Student } from '@/types';

function EditStudentContent({ student }: { student: Student }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Header
        title="Edit Student"
        subtitle={student.name}
        backHref={`/dashboard/students/${student.id}`}
        backLabel="Back to student profile"
      />
      <PageMain>
        <StudentForm student={student} isEdit />
      </PageMain>
    </div>
  );
}

export default function EditStudentPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <AccessGate
      allow={canManageStudents}
      redirectTo="/dashboard/students"
      deniedMessage="You do not have permission to edit student records."
      backLabel="Back to students"
    >
      <StudentRecordGate studentId={id} requireManage redirectTo="/dashboard/students">
        {(student) => <EditStudentContent student={student} />}
      </StudentRecordGate>
    </AccessGate>
  );
}
