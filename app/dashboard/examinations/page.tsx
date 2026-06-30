'use client';

import { useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { PageMain } from '@/components/layout/PageMain';
import {
  EXAM_FILTER_ALL,
  ExaminationsDirectory,
  type ExamViewMode,
} from '@/components/examinations/ExaminationsDirectory';
import { getExaminations, deleteExamination } from '@/lib/firestore';
import { Examination } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { AccessGate } from '@/components/auth/AccessGate';
import {
  canManageExams,
  canViewExaminationsPortal,
  isTeacher,
  resolveTeacherAllowedGrades,
  resolveTeacherAllowedSubjects,
} from '@/lib/access-control';
import { examinationInAllowedGrades } from '@/lib/exam-teacher-filters';

function ExaminationsPageContent() {
  const [exams, setExams] = useState<Examination[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState(EXAM_FILTER_ALL);
  const [subjectFilter, setSubjectFilter] = useState(EXAM_FILTER_ALL);
  const [termFilter, setTermFilter] = useState(EXAM_FILTER_ALL);
  const [yearFilter, setYearFilter] = useState(EXAM_FILTER_ALL);
  const [viewMode, setViewMode] = useState<ExamViewMode>('list');
  const { userProfile, linkedStaff } = useAuth();
  const canManage = canManageExams(userProfile);
  const gradeScopedTeacher = isTeacher(userProfile);

  const teacherGrades = useMemo(
    () =>
      gradeScopedTeacher
        ? resolveTeacherAllowedGrades(userProfile, linkedStaff)
        : null,
    [gradeScopedTeacher, userProfile, linkedStaff],
  );

  const teacherSubjects = useMemo(
    () =>
      gradeScopedTeacher
        ? resolveTeacherAllowedSubjects(userProfile, linkedStaff)
        : null,
    [gradeScopedTeacher, userProfile, linkedStaff],
  );

  useEffect(() => {
    getExaminations().then((e) => {
      setExams(e);
      setLoading(false);
    });
  }, []);

  const scopedExams = useMemo(() => {
    if (!gradeScopedTeacher) return exams;
    if (!teacherGrades?.length) return [];
    return exams.filter((exam) => examinationInAllowedGrades(exam, teacherGrades));
  }, [exams, gradeScopedTeacher, teacherGrades]);

  const handleDelete = async (id: string) => {
    await deleteExamination(id);
    setExams((prev) => prev.filter((e) => e.id !== id));
  };

  const teacherGradesLabel =
    gradeScopedTeacher && teacherGrades?.length
      ? teacherGrades.join(', ')
      : gradeScopedTeacher
        ? 'none assigned'
        : null;

  const teacherSubjectsLabel =
    gradeScopedTeacher && teacherSubjects?.length
      ? teacherSubjects.join(', ')
      : gradeScopedTeacher
        ? 'none assigned'
        : null;

  const subtitle = loading
    ? 'Loading directory…'
    : gradeScopedTeacher
      ? `${scopedExams.length} examination${scopedExams.length !== 1 ? 's' : ''} · Grades taught: ${teacherGradesLabel} · Subjects: ${teacherSubjectsLabel}`
      : canManage
        ? `${scopedExams.length} examination${scopedExams.length !== 1 ? 's' : ''} · Grades 6–13`
        : `${scopedExams.length} examination${scopedExams.length !== 1 ? 's' : ''} · View results & export`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Header title="Examinations" subtitle={subtitle} />
      <PageMain flexContent className="flex flex-col">
        {gradeScopedTeacher && teacherGrades && !teacherGrades.length && !loading && (
          <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            No grades are assigned on your staff profile yet. Ask an administrator to set{' '}
            <strong>Grades taught</strong> on your employment record, then sign out and back in.
          </p>
        )}
        {gradeScopedTeacher && teacherSubjects && !teacherSubjects.length && !loading && (
          <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            No subjects are listed on your staff profile yet. Ask an administrator to set{' '}
            <strong>Subjects taught</strong> on your employment record.
          </p>
        )}
        <ExaminationsDirectory
          exams={scopedExams}
          loading={loading}
          canManage={canManage}
          search={search}
          onSearchChange={setSearch}
          gradeFilter={gradeFilter}
          onGradeFilterChange={setGradeFilter}
          subjectFilter={subjectFilter}
          onSubjectFilterChange={gradeScopedTeacher ? setSubjectFilter : undefined}
          gradeFilterOptions={gradeScopedTeacher ? teacherGrades ?? undefined : undefined}
          gradeFilterLabel={gradeScopedTeacher ? 'Grades taught' : 'Grade'}
          subjectFilterOptions={gradeScopedTeacher ? teacherSubjects ?? undefined : undefined}
          subjectFilterLabel="Subjects taught"
          termFilter={termFilter}
          onTermFilterChange={setTermFilter}
          yearFilter={yearFilter}
          onYearFilterChange={setYearFilter}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onDelete={handleDelete}
        />
      </PageMain>
    </div>
  );
}

export default function ExaminationsPage() {
  return (
    <AccessGate allow={canViewExaminationsPortal}>
      <ExaminationsPageContent />
    </AccessGate>
  );
}
