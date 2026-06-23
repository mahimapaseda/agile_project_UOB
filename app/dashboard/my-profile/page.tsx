'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AccessGate } from '@/components/auth/AccessGate';
import { useAuth } from '@/lib/auth-context';
import { getStudentByAdmissionNumber } from '@/lib/firestore';
import { getLinkedAdmissionNumber, isStudentAccount } from '@/lib/access-control';
import { Header } from '@/components/layout/Header';
import { PageMain } from '@/components/layout/PageMain';
import { Card, CardContent } from '@/components/ui/card';
import { GraduationCap } from 'lucide-react';

function MyProfileContent() {
  const { userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !userProfile) return;

    const admissionNumber = getLinkedAdmissionNumber(userProfile);
    if (!admissionNumber) return;

    getStudentByAdmissionNumber(admissionNumber)
      .then((student) => {
        if (student) router.replace(`/dashboard/students/${student.id}`);
      })
      .catch(() => {
        router.replace('/dashboard');
      });
  }, [loading, userProfile, router]);

  const admissionNumber = getLinkedAdmissionNumber(userProfile);

  return (
    <>
      <Header title="My Profile" subtitle="Student portal" />
      <PageMain className="flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            {loading || (admissionNumber && userProfile) ? (
              <>
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-600 text-sm">
                  {admissionNumber ? `Loading ${admissionNumber}...` : 'Loading...'}
                </p>
              </>
            ) : !admissionNumber ? (
              <>
                <GraduationCap className="w-12 h-12 text-blue-300 mx-auto mb-3" />
                <p className="text-gray-700 font-medium">No student record linked</p>
                <p className="text-sm text-gray-500 mt-2">
                  Ask the school to set your <strong>admission number</strong> on your student login.
                </p>
              </>
            ) : null}
          </CardContent>
        </Card>
      </PageMain>
    </>
  );
}

export default function MyProfilePage() {
  return (
    <AccessGate
      allow={isStudentAccount}
      deniedMessage="My Profile is for student accounts only."
      backLabel="Back to dashboard"
    >
      <MyProfileContent />
    </AccessGate>
  );
}
