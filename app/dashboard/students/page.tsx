'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  collectClassFilterOptions,
  studentMatchesClassFilter,
} from '@/lib/grade-class-options';
import { Header } from '@/components/layout/Header';
import { PageMain } from '@/components/layout/PageMain';
import { StudentsDirectory } from '@/components/students/StudentsDirectory';
import { AccessGate } from '@/components/auth/AccessGate';
import { DataLoadError } from '@/components/ui/DataLoadError';
import { deleteStudent, getStudentByAdmissionNumber } from '@/lib/firestore';
import { getStudentsForProfile } from '@/lib/students-for-profile';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { formatFirestoreError } from '@/lib/firestore-errors';
import { Student } from '@/types';
import { useAuth } from '@/lib/auth-context';
import {
  canManageStudents,
  canAccessStudentsModule,
  canViewStudentExamAnalysis,
  getLinkedAdmissionNumber,
  isRestrictedToOwnStudent,
  isTeacher,
  resolveTeacherAllowedGrades,
} from '@/lib/access-control';

const FILTER_ALL = 'all';

function filterStudents(
  data: Student[],
  search: string,
  gradeFilter: string,
  statusFilter: string,
  classFilter: string,
): Student[] {
  let out = data;
  const q = search.trim().toLowerCase();
  if (q) {
    out = out.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.admissionNumber.toLowerCase().includes(q) ||
        s.grade.toLowerCase().includes(q),
    );
  }
  if (gradeFilter !== FILTER_ALL) out = out.filter((s) => s.grade === gradeFilter);
  if (statusFilter !== FILTER_ALL) out = out.filter((s) => s.status === statusFilter);
  if (classFilter !== FILTER_ALL) {
    out = out.filter((s) => studentMatchesClassFilter(s, classFilter));
  }
  return out;
}

function StudentsPageContent() {
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [gradeFilter, setGradeFilter] = useState(FILTER_ALL);
  const [statusFilter, setStatusFilter] = useState(FILTER_ALL);
  const [classFilter, setClassFilter] = useState(FILTER_ALL);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const { userProfile, linkedStaff } = useAuth();

  const canManage = canManageStudents(userProfile);
  const canViewExamAnalysis = canViewStudentExamAnalysis(userProfile);
  const restricted = isRestrictedToOwnStudent(userProfile);
  const gradeScopedTeacher = isTeacher(userProfile);

  const teacherGrades = useMemo(
    () =>
      gradeScopedTeacher
        ? resolveTeacherAllowedGrades(userProfile, linkedStaff)
        : null,
    [gradeScopedTeacher, userProfile, linkedStaff],
  );

  const fetchAll = useCallback(async () => {
    if (!userProfile) return;
    setLoading(true);
    setLoadError(null);
    try {
      if (restricted) {
        const admissionNumber = getLinkedAdmissionNumber(userProfile);
        if (!admissionNumber) {
          setAllStudents([]);
          return;
        }
        const own = await getStudentByAdmissionNumber(admissionNumber);
        setAllStudents(own ? [own] : []);
        return;
      }

      if (gradeScopedTeacher && !teacherGrades?.length) {
        setAllStudents([]);
        return;
      }

      const data = await getStudentsForProfile(
        userProfile,
        undefined,
        undefined,
        { linkedStaff },
      );
      setAllStudents(data);
    } catch (err) {
      console.error('Failed to load students:', err);
      setLoadError(formatFirestoreError(err));
      setAllStudents([]);
    } finally {
      setLoading(false);
    }
  }, [userProfile, restricted, gradeScopedTeacher, teacherGrades, linkedStaff]);

  useEffect(() => {
    if (!userProfile) return;
    if (gradeScopedTeacher && teacherGrades === null) return;
    void fetchAll();
  }, [userProfile, gradeScopedTeacher, teacherGrades, fetchAll]);

  const classFilterOptions = useMemo(
    () => collectClassFilterOptions(allStudents, gradeFilter),
    [allStudents, gradeFilter],
  );

  useEffect(() => {
    if (classFilter === FILTER_ALL) return;
    if (!classFilterOptions.includes(classFilter)) {
      setClassFilter(FILTER_ALL);
    }
  }, [classFilter, classFilterOptions]);

  const students = useMemo(
    () =>
      filterStudents(
        allStudents,
        debouncedSearch,
        gradeFilter,
        statusFilter,
        classFilter,
      ),
    [allStudents, debouncedSearch, gradeFilter, statusFilter, classFilter],
  );

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteStudent(id);
      setAllStudents((prev) => prev.filter((s) => s.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const teacherGradesLabel =
    gradeScopedTeacher && teacherGrades?.length
      ? teacherGrades.join(', ')
      : gradeScopedTeacher
        ? 'none assigned'
        : null;

  const subtitle = restricted
    ? 'View only — linked to your account'
    : gradeScopedTeacher
      ? loading
        ? 'Loading your classes…'
        : `${students.length} student${students.length !== 1 ? 's' : ''} · Grades: ${teacherGradesLabel}`
      : loading
        ? 'Loading directory…'
        : `${students.length} student${students.length !== 1 ? 's' : ''}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Header
        title={restricted ? 'Student record' : gradeScopedTeacher ? 'My students' : 'Students'}
        subtitle={subtitle}
      />
      <PageMain flexContent className="flex flex-col">
        {loadError && <DataLoadError message={loadError} onRetry={() => void fetchAll()} />}
        {gradeScopedTeacher && teacherGrades && !teacherGrades.length && !loading && (
          <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            No grades are assigned on your staff profile yet. Ask an administrator to set{' '}
            <strong>Grades Taught</strong> on your employment record, then sign out and back in.
          </p>
        )}
        <StudentsDirectory
          students={students}
          loading={loading}
          search={search}
          onSearchChange={setSearch}
          gradeFilter={gradeFilter}
          onGradeFilterChange={setGradeFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          classFilter={classFilter}
          onClassFilterChange={setClassFilter}
          classFilterOptions={classFilterOptions}
          canManage={canManage}
          canViewExamAnalysis={canViewExamAnalysis}
          restricted={restricted}
          gradeFilterOptions={gradeScopedTeacher ? teacherGrades ?? undefined : undefined}
          deletingId={deletingId}
          onDelete={handleDelete}
          csvImportOpen={csvImportOpen}
          onCsvImportOpenChange={setCsvImportOpen}
          onImported={() => {
            setCsvImportOpen(false);
            void fetchAll();
          }}
          viewMode={restricted ? 'list' : viewMode}
          onViewModeChange={setViewMode}
        />
      </PageMain>
    </div>
  );
}

export default function StudentsPage() {
  return (
    <AccessGate
      allow={(profile) => canAccessStudentsModule(profile) || isRestrictedToOwnStudent(profile)}
      deniedMessage="You do not have access to the students module."
      backLabel="Back to dashboard"
    >
      <StudentsPageContent />
    </AccessGate>
  );
}
