'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { PageMain } from '@/components/layout/PageMain';
import { StudentRecordGate } from '@/components/auth/StudentRecordGate';
import { getStudentResults } from '@/lib/firestore';
import { Student, ExamResult } from '@/types';
import { useAuth } from '@/lib/auth-context';
import {
  canManageStudents,
  canViewStudentExamAnalysis,
  isParentAccount,
  isStudentAccount,
} from '@/lib/access-control';
import { StudentProfileDetails } from '@/components/students/StudentProfileDetails';
import { formatFirestoreError } from '@/lib/firestore-errors';
import { DataLoadError } from '@/components/ui/DataLoadError';

function StudentDetailContent({ student, studentId }: { student: Student; studentId: string }) {
  const { userProfile } = useAuth();
  const [results, setResults] = useState<ExamResult[]>([]);
  const [resultsError, setResultsError] = useState<string | null>(null);
  const [loadingResults, setLoadingResults] = useState(true);

  const canManage = canManageStudents(userProfile);
  const canViewExamAnalysis = canViewStudentExamAnalysis(userProfile);
  const readOnlyView = isParentAccount(userProfile) || isStudentAccount(userProfile);

  useEffect(() => {
    let cancelled = false;
    setLoadingResults(true);
    setResultsError(null);

    getStudentResults(student.id, student.admissionNumber)
      .then((r) => {
        if (!cancelled) setResults(r);
      })
      .catch((err) => {
        if (!cancelled) {
          setResultsError(formatFirestoreError(err));
          setResults([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingResults(false);
      });

    return () => {
      cancelled = true;
    };
  }, [student.id, student.admissionNumber]);

  const backHref = readOnlyView ? '/dashboard' : '/dashboard/students';
  const handleExport = async () => {
    const { exportStudentProfilePDF } = await import('@/lib/pdf-export');
    await exportStudentProfilePDF(student, results);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Header
        title={readOnlyView ? (isParentAccount(userProfile) ? 'My Child' : 'My Profile') : 'Student Profile'}
        backHref={backHref}
        backLabel={readOnlyView ? 'Back to dashboard' : 'Back to students'}
      />
      <PageMain>
        {resultsError && !loadingResults && (
          <DataLoadError message={`Exam results: ${resultsError}`} />
        )}
        <StudentProfileDetails
          student={student}
          results={results}
          studentId={studentId}
          canManage={canManage}
          canViewExamAnalysis={canViewExamAnalysis}
          onExport={handleExport}
          backHref={backHref}
        />
      </PageMain>
    </div>
  );
}

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <StudentRecordGate studentId={id}>
      {(student) => <StudentDetailContent student={student} studentId={id} />}
    </StudentRecordGate>
  );
}
