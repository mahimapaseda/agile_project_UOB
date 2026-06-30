'use client';

import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { PageMain } from '@/components/layout/PageMain';
import { StudentExamPerformanceView } from '@/components/students/StudentExamPerformanceView';
import { getStudentByAdmissionNumber, getStudentResults } from '@/lib/firestore';
import { getLinkedAdmissionNumber, isParentAccount } from '@/lib/access-control';
import { Student, ExamResult, UserProfile } from '@/types';

interface LinkedStudentExamPerformanceProps {
  userProfile: UserProfile | null;
  loadingAuth: boolean;
}

export function LinkedStudentExamPerformance({
  userProfile,
  loadingAuth,
}: LinkedStudentExamPerformanceProps) {
  const [student, setStudent] = useState<Student | null>(null);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isParent = isParentAccount(userProfile);
  const admissionNumber = getLinkedAdmissionNumber(userProfile);

  useEffect(() => {
    if (loadingAuth) return;

    if (!admissionNumber) {
      setLoading(false);
      setError('No admission number is linked to this account.');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    (async () => {
      try {
        const s = await getStudentByAdmissionNumber(admissionNumber);
        if (cancelled) return;
        if (!s) {
          setError(`No student record found for admission number ${admissionNumber}.`);
          setStudent(null);
          setResults([]);
          return;
        }
        const r = await getStudentResults(s.id, s.admissionNumber);
        if (cancelled) return;
        setStudent(s);
        setResults(r);
      } catch {
        if (!cancelled) {
          setError('Could not load exam results. Please try again later.');
          setStudent(null);
          setResults([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [admissionNumber, loadingAuth]);

  const title = isParent ? "Child's Exam Performance" : 'Exam Performance Analysis';
  const subtitle = isParent ? 'Subject-wise results' : 'Subject-wise results';

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <Header title={title} subtitle={subtitle} />
      <PageMain
        noScroll
        className="flex min-h-0 flex-1 flex-col w-full max-w-none p-3 sm:p-4 lg:p-5"
      >
        {loadingAuth || loading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-blue-600 border-t-transparent" />
          </div>
        ) : error ? (
          <div className="flex shrink-0 items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        ) : student ? (
          <StudentExamPerformanceView
            student={student}
            results={results}
            backHref="/dashboard"
            backLabel="Dashboard"
            profileLinkLabel={isParent ? 'View child profile' : 'View full profile'}
          />
        ) : null}
      </PageMain>
    </div>
  );
}
