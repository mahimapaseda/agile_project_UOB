'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { PageMain } from '@/components/layout/PageMain';
import { AccessGate } from '@/components/auth/AccessGate';
import { StudentRecordGate } from '@/components/auth/StudentRecordGate';
import { StudentExamPerformanceView } from '@/components/students/StudentExamPerformanceView';
import { getStudentResults } from '@/lib/firestore';
import { canViewStudentExamAnalysis } from '@/lib/access-control';
import { formatFirestoreError } from '@/lib/firestore-errors';
import { DataLoadError } from '@/components/ui/DataLoadError';
import { ExamResult, Student } from '@/types';

function StudentExamPerformanceContent({ student }: { student: Student }) {
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    getStudentResults(student.id, student.admissionNumber)
      .then((r) => {
        if (!cancelled) setResults(r);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(formatFirestoreError(err));
          setResults([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [student.id, student.admissionNumber]);

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Header title="Exam Performance Analysis" subtitle="Loading…" />
        <PageMain className="flex flex-1 items-center justify-center">
          <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-blue-600 border-t-transparent" />
        </PageMain>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <Header
        title="Exam Performance Analysis"
        subtitle={student.name}
        backHref={`/dashboard/students/${student.id}`}
        backLabel="Back to student profile"
      />
      <PageMain
        noScroll
        className="flex min-h-0 flex-1 flex-col w-full max-w-none p-3 sm:p-4 lg:p-5"
      >
        {loadError && <DataLoadError message={loadError} />}
        <StudentExamPerformanceView
          student={student}
          results={results}
          backHref="/dashboard/students"
          backLabel="Students"
          profileLinkLabel="Student profile"
        />
      </PageMain>
    </div>
  );
}

export default function StudentExamPerformancePage() {
  const { id } = useParams<{ id: string }>();

  return (
    <AccessGate
      allow={canViewStudentExamAnalysis}
      redirectTo="/dashboard/students"
      deniedMessage="You do not have permission to view student exam analysis."
      backLabel="Back to students"
    >
      <StudentRecordGate studentId={id} redirectTo="/dashboard/students">
        {(student) => <StudentExamPerformanceContent student={student} />}
      </StudentRecordGate>
    </AccessGate>
  );
}
