'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AccessGate } from '@/components/auth/AccessGate';
import { useAuth } from '@/lib/auth-context';
import { getStudentByAdmissionNumber } from '@/lib/firestore';
import { getLinkedAdmissionNumber, isParentAccount } from '@/lib/access-control';
import { Header } from '@/components/layout/Header';
import { PageMain } from '@/components/layout/PageMain';
import { Card, CardContent } from '@/components/ui/card';
import { Heart } from 'lucide-react';

function MyChildContent() {
  const { userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !userProfile) return;

    const admissionNumber = getLinkedAdmissionNumber(userProfile);
    if (!admissionNumber) return;

    getStudentByAdmissionNumber(admissionNumber).then((student) => {
      if (student) {
        router.replace(`/dashboard/students/${student.id}`);
      }
    });
  }, [loading, userProfile, router]);

  const admissionNumber = getLinkedAdmissionNumber(userProfile);

  return (
    <>
      <Header title="My Child" subtitle="Parent portal" />
      <PageMain className="flex items-center justify-center">
        <Card className="max-w-md border-slate-200/80 shadow-sm">
          <CardContent className="flex flex-col items-center px-6 py-10 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50">
              <Heart className="h-7 w-7 text-rose-500" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Loading your child&apos;s record</h2>
            <p className="mt-2 text-sm text-slate-500">
              {admissionNumber
                ? `Looking up admission number ${admissionNumber}…`
                : 'No child is linked to this parent account yet. Contact the school office.'}
            </p>
          </CardContent>
        </Card>
      </PageMain>
    </>
  );
}

export default function MyChildPage() {
  return (
    <AccessGate
      allow={isParentAccount}
      deniedMessage="The My Child portal is for parent accounts only."
      backLabel="Back to dashboard"
    >
      <MyChildContent />
    </AccessGate>
  );
}
