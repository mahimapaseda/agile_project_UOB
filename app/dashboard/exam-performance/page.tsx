'use client';

import { AccessGate } from '@/components/auth/AccessGate';
import { LinkedStudentExamPerformance } from '@/components/students/LinkedStudentExamPerformance';
import { isParentAccount, isStudentAccount } from '@/lib/access-control';
import { useAuth } from '@/lib/auth-context';

function ExamPerformanceContent() {
  const { userProfile, loading } = useAuth();
  if (!userProfile) return null;
  return <LinkedStudentExamPerformance userProfile={userProfile} loadingAuth={loading} />;
}

export default function ExamPerformancePage() {
  return (
    <AccessGate
      allow={(profile) => isStudentAccount(profile) || isParentAccount(profile)}
      deniedMessage="Exam performance analysis is available to student and parent accounts only."
      backLabel="Back to dashboard"
    >
      <ExamPerformanceContent />
    </AccessGate>
  );
}
