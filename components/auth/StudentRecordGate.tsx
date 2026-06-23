'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getStudent } from '@/lib/firestore';
import {
  canManageStudents,
  canViewStudentRecord,
  resolveTeacherAllowedGrades,
} from '@/lib/access-control';
import { formatFirestoreError } from '@/lib/firestore-errors';
import { PermissionDenied } from '@/components/auth/PermissionDenied';
import { Student } from '@/types';

interface StudentRecordGateProps {
  studentId: string;
  children: (student: Student) => React.ReactNode;
  requireManage?: boolean;
  redirectTo?: string;
}

export function StudentRecordGate({
  studentId,
  children,
  requireManage = false,
  redirectTo = '/dashboard/students',
}: StudentRecordGateProps) {
  const { userProfile, linkedStaff, loading: authLoading } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
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
        const s = await getStudent(studentId);
        if (cancelled) return;

        if (!s) {
          setStudent(null);
          return;
        }

        const teacherGrades = resolveTeacherAllowedGrades(userProfile, linkedStaff);
        const canView = canViewStudentRecord(userProfile, s, { teacherGrades, linkedStaff });
        const canEdit = canManageStudents(userProfile) && canView;

        if (!canView || (requireManage && !canEdit)) {
          setDenied(true);
          setStudent(null);
          return;
        }

        setStudent(s);
      } catch (err) {
        if (!cancelled) {
          setLoadError(formatFirestoreError(err));
          setStudent(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [studentId, userProfile, linkedStaff, authLoading, requireManage]);

  if (authLoading || loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (denied) {
    return (
      <PermissionDenied
        message={
          requireManage
            ? 'You do not have permission to edit this student record.'
            : 'You do not have permission to view this student record.'
        }
        backHref={redirectTo}
        backLabel="Back to students"
      />
    );
  }

  if (loadError) {
    return (
      <PermissionDenied
        title="Could not load student"
        message={loadError}
        backHref={redirectTo}
        backLabel="Back to students"
      />
    );
  }

  if (!student) {
    return (
      <PermissionDenied
        title="Student not found"
        message="This student record may have been removed or you may not have access."
        backHref={redirectTo}
        backLabel="Back to students"
      />
    );
  }

  return <>{children(student)}</>;
}
