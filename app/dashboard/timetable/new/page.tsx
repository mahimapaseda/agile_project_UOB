'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { PageMain } from '@/components/layout/PageMain';
import { Button } from '@/components/ui/button';
import { AccessGate } from '@/components/auth/AccessGate';
import { TimetableForm, type TimetableFormData } from '@/components/timetable/TimetableForm';
import { canManageTimetable } from '@/lib/access-control';
import { addTimetable } from '@/lib/firestore';
import { buildTimetableTitle } from '@/lib/timetable-utils';
import { useAuth } from '@/lib/auth-context';

function NewTimetablePageContent() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (data: TimetableFormData) => {
    setSaving(true);
    setError('');
    try {
      if (!userProfile?.uid) {
        setError('You must be signed in to create a timetable.');
        return;
      }
      const id = await addTimetable({
        title: buildTimetableTitle(data.grade, data.section, data.academicYear, data.term),
        grade: data.grade,
        section: data.section,
        academicYear: data.academicYear,
        term: data.term,
        schedule: data.schedule,
        notes: data.notes || undefined,
        createdBy: userProfile.uid,
      });
      router.push(`/dashboard/timetable/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this timetable. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Header
        title="New timetable"
        subtitle="Create a weekly class schedule"
        backHref="/dashboard/timetable"
        backLabel="Back to timetable"
      />
      <PageMain>
        <Button asChild variant="ghost" className="mb-4 -ml-2 min-h-10">
          <Link href="/dashboard/timetable">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to timetable
          </Link>
        </Button>
        {error ? (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}
        <TimetableForm saving={saving} submitLabel="Create timetable" onSubmit={onSubmit} />
      </PageMain>
    </div>
  );
}

export default function NewTimetablePage() {
  return (
    <AccessGate allow={canManageTimetable}>
      <NewTimetablePageContent />
    </AccessGate>
  );
}
