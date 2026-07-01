'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { PageMain } from '@/components/layout/PageMain';
import { Button } from '@/components/ui/button';
import { AccessGate } from '@/components/auth/AccessGate';
import { TimetableForm, type TimetableFormData } from '@/components/timetable/TimetableForm';
import { canManageTimetable } from '@/lib/access-control';
import { getTimetable, updateTimetable } from '@/lib/firestore';
import { buildTimetableTitle } from '@/lib/timetable-utils';
import type { ClassTimetable } from '@/types';

function EditTimetablePageContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [timetable, setTimetable] = useState<ClassTimetable | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getTimetable(id);
        if (!cancelled) setTimetable(data);
      } catch {
        if (!cancelled) setTimetable(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const onSubmit = async (data: TimetableFormData) => {
    setSaving(true);
    setError('');
    try {
      await updateTimetable(id, {
        title: buildTimetableTitle(data.grade, data.section, data.academicYear, data.term),
        grade: data.grade,
        section: data.section,
        academicYear: data.academicYear,
        term: data.term,
        schedule: data.schedule,
        notes: data.notes || undefined,
      });
      router.push(`/dashboard/timetable/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save changes. Try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <Header title="Edit timetable" backHref="/dashboard/timetable" backLabel="Back to timetable" />
        <PageMain className="flex items-center justify-center">
          <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-violet-600 border-t-transparent" />
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
        title="Edit timetable"
        subtitle={timetable.title}
        backHref={`/dashboard/timetable/${id}`}
        backLabel="Back to timetable"
      />
      <PageMain>
        <Button asChild variant="ghost" className="mb-4 -ml-2 min-h-10">
          <Link href={`/dashboard/timetable/${id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Cancel editing
          </Link>
        </Button>
        {error ? (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}
        <TimetableForm
          initial={timetable}
          saving={saving}
          submitLabel="Save changes"
          onSubmit={onSubmit}
        />
      </PageMain>
    </div>
  );
}

export default function EditTimetablePage() {
  return (
    <AccessGate allow={canManageTimetable}>
      <EditTimetablePageContent />
    </AccessGate>
  );
}
