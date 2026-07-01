'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { PageMain } from '@/components/layout/PageMain';
import { TimetablesDirectory } from '@/components/timetable/TimetablesDirectory';
import { AccessGate } from '@/components/auth/AccessGate';
import { useAuth } from '@/lib/auth-context';
import { canManageTimetable, canViewTimetable } from '@/lib/access-control';
import { deleteTimetable } from '@/lib/firestore';
import { getTimetablesForProfile } from '@/lib/timetable-for-profile';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { formatFirestoreError } from '@/lib/firestore-errors';
import { DataLoadError } from '@/components/ui/DataLoadError';
import type { ClassTimetable } from '@/types';

const FILTER_ALL = 'all';

function filterTimetables(
  data: ClassTimetable[],
  search: string,
  gradeFilter: string,
  yearFilter: string,
): ClassTimetable[] {
  let out = data;
  const q = search.trim().toLowerCase();
  if (q) {
    out = out.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.grade.toLowerCase().includes(q) ||
        t.section.toLowerCase().includes(q) ||
        t.term.toLowerCase().includes(q) ||
        String(t.academicYear).includes(q),
    );
  }
  if (gradeFilter !== FILTER_ALL) out = out.filter((t) => t.grade === gradeFilter);
  if (yearFilter !== FILTER_ALL) out = out.filter((t) => t.academicYear === Number(yearFilter));
  return out;
}

function TimetablePageContent() {
  const [allTimetables, setAllTimetables] = useState<ClassTimetable[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [gradeFilter, setGradeFilter] = useState(FILTER_ALL);
  const [yearFilter, setYearFilter] = useState(FILTER_ALL);
  const { userProfile } = useAuth();
  const canManage = canManageTimetable(userProfile);

  const fetchAll = useCallback(async () => {
    if (!userProfile) return;
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getTimetablesForProfile(userProfile);
      setAllTimetables(data);
    } catch (err) {
      setLoadError(formatFirestoreError(err));
      setAllTimetables([]);
    } finally {
      setLoading(false);
    }
  }, [userProfile]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const timetables = useMemo(
    () => filterTimetables(allTimetables, debouncedSearch, gradeFilter, yearFilter),
    [allTimetables, debouncedSearch, gradeFilter, yearFilter],
  );

  const handleDelete = async (id: string) => {
    await deleteTimetable(id);
    setAllTimetables((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Header
        title="Timetable"
        subtitle={
          loading
            ? 'Loading schedules…'
            : `${allTimetables.length} timetable${allTimetables.length !== 1 ? 's' : ''}`
        }
      />
      <PageMain flexContent className="flex flex-col">
        {loadError && <DataLoadError message={loadError} onRetry={() => void fetchAll()} />}
        <TimetablesDirectory
          timetables={timetables}
          loading={loading}
          canManage={canManage}
          search={search}
          onSearchChange={setSearch}
          gradeFilter={gradeFilter}
          onGradeFilterChange={setGradeFilter}
          yearFilter={yearFilter}
          onYearFilterChange={setYearFilter}
          onDelete={handleDelete}
        />
      </PageMain>
    </div>
  );
}

export default function TimetablePage() {
  return (
    <AccessGate allow={canViewTimetable}>
      <TimetablePageContent />
    </AccessGate>
  );
}
