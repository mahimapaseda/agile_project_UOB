'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { PageMain } from '@/components/layout/PageMain';
import { Button } from '@/components/ui/button';
import { AccessGate } from '@/components/auth/AccessGate';
import { TimetableDetailView } from '@/components/timetable/TimetableDetailView';
import { useAuth } from '@/lib/auth-context';
import {
  canManageTimetable,
  canViewTimetable,
  getLinkedAdmissionNumber,
  isRestrictedToOwnStudent,
} from '@/lib/access-control';
import { getStudentByAdmissionNumber, getTimetable } from '@/lib/firestore';
import { timetablesMatchClass } from '@/lib/timetable-utils';
import type { ClassTimetable } from '@/types';

function TimetableDetailPageContent() {
  const { id } = useParams<{ id: string }>();
  const [timetable, setTimetable] = useState<ClassTimetable | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const { userProfile } = useAuth();
  const canManage = canManageTimetable(userProfile);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await getTimetable(id);
        if (cancelled) return;

        if (!data) {
          setTimetable(null);
          return;
        }

        if (userProfile && isRestrictedToOwnStudent(userProfile)) {
          const admissionNumber = getLinkedAdmissionNumber(userProfile);
          if (admissionNumber) {
            const student = await getStudentByAdmissionNumber(admissionNumber);
            if (
              !student ||
              !timetablesMatchClass(data, student.grade, student.section ?? '')
            ) {
              setDenied(true);
              return;
            }
          } else {
            setDenied(true);
            return;
          }
        }

        setTimetable(data);
      } catch {
        if (!cancelled) setTimetable(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, userProfile]);

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <Header title="Timetable" backHref="/dashboard/timetable" backLabel="Back to timetable" />
        <PageMain className="flex items-center justify-center">
          <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-violet-600 border-t-transparent" />
        </PageMain>
      </div>
    );
  }

  if (denied) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <Header title="Access denied" backHref="/dashboard/timetable" backLabel="Back to timetable" />
        <PageMain className="text-center">
          <p className="text-slate-600">You can only view your own class timetable.</p>
          <Button asChild className="mt-4">
            <Link href="/dashboard/timetable">Back to timetable</Link>
          </Button>
        </PageMain>
      </div>
    );
  }

  if (!timetable) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <Header
          title="Timetable not found"
          backHref="/dashboard/timetable"
          backLabel="Back to timetable"
        />
        <PageMain className="text-center">
          <p className="text-slate-600">This timetable could not be found.</p>
          <Button asChild className="mt-4">
            <Link href="/dashboard/timetable">Back to timetable</Link>
          </Button>
        </PageMain>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Header
        title={timetable.title}
        subtitle={`${timetable.grade} · ${timetable.term} ${timetable.academicYear}`}
        backHref="/dashboard/timetable"
        backLabel="Back to timetable"
      />
      <PageMain>
        <TimetableDetailView timetable={timetable} canManage={canManage} />
      </PageMain>
    </div>
  );
}

export default function TimetableDetailPage() {
  return (
    <AccessGate allow={canViewTimetable}>
      <TimetableDetailPageContent />
    </AccessGate>
  );
}
