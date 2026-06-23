'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  BookOpen,
  Eye,
  Pencil,
  Trash2,
  GraduationCap,
  CalendarDays,
  LayoutGrid,
  List,
  ChevronRight,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DirectorySkeleton } from '@/components/ui/DirectorySkeleton';
import { DirectoryPanelHeader } from '@/components/layout/DirectoryPanelHeader';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ExamCurriculumPanel } from '@/components/examinations/ExamCurriculumPanel';
import { Examination } from '@/types';
import { formatDate, cn } from '@/lib/utils';
import { StatIconBadge } from '@/components/ui/StatIconBadge';
import { countCurriculumSubjects, isGrade12to13 } from '@/lib/exam-subjects';
import { examinationIncludesSubject } from '@/lib/exam-teacher-filters';
import { EXAM_TERM_OPTIONS } from '@/lib/examination-utils';
import { formatClassSection, isAdvancedLevelGrade } from '@/lib/grade-class-options';

export const EXAM_FILTER_ALL = 'all';
export type ExamViewMode = 'list' | 'grid';

interface ExaminationsDirectoryProps {
  exams: Examination[];
  loading: boolean;
  canManage: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  gradeFilter: string;
  onGradeFilterChange: (value: string) => void;
  termFilter: string;
  onTermFilterChange: (value: string) => void;
  yearFilter: string;
  onYearFilterChange: (value: string) => void;
  subjectFilter?: string;
  onSubjectFilterChange?: (value: string) => void;
  /** When set (e.g. teachers), grade pills are limited to these grades. */
  gradeFilterOptions?: string[];
  gradeFilterLabel?: string;
  /** When set (e.g. teachers), shows a subjects-taught filter row. */
  subjectFilterOptions?: string[];
  subjectFilterLabel?: string;
  viewMode: ExamViewMode;
  onViewModeChange: (mode: ExamViewMode) => void;
  onDelete: (id: string) => void | Promise<void>;
}

export function ExaminationsDirectory({
  exams,
  loading,
  canManage,
  search,
  onSearchChange,
  gradeFilter,
  onGradeFilterChange,
  termFilter,
  onTermFilterChange,
  yearFilter,
  onYearFilterChange,
  subjectFilter = EXAM_FILTER_ALL,
  onSubjectFilterChange,
  gradeFilterOptions,
  gradeFilterLabel = 'Grade',
  subjectFilterOptions,
  subjectFilterLabel = 'Subjects taught',
  viewMode,
  onViewModeChange,
  onDelete,
}: ExaminationsDirectoryProps) {
  const gradeOptions = useMemo(() => {
    if (gradeFilterOptions?.length) {
      return gradeFilterOptions;
    }
    return [...new Set(exams.map((e) => e.grade))].sort();
  }, [exams, gradeFilterOptions]);

  const yearOptions = useMemo(() => {
    return [...new Set(exams.map((e) => e.year))].sort((a, b) => b - a);
  }, [exams]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return exams.filter((e) => {
      if (gradeFilter !== EXAM_FILTER_ALL && e.grade !== gradeFilter) return false;
      if (termFilter !== EXAM_FILTER_ALL && e.term !== termFilter) return false;
      if (yearFilter !== EXAM_FILTER_ALL && String(e.year) !== yearFilter) return false;
      if (
        subjectFilter !== EXAM_FILTER_ALL &&
        !examinationIncludesSubject(e, subjectFilter)
      ) {
        return false;
      }
      if (!q) return true;
      const sectionLabel = e.section ? formatClassSection(e.grade, e.section).toLowerCase() : '';
      return (
        e.examName.toLowerCase().includes(q) ||
        e.grade.toLowerCase().includes(q) ||
        e.term.toLowerCase().includes(q) ||
        String(e.year).includes(q) ||
        sectionLabel.includes(q)
      );
    });
  }, [exams, search, gradeFilter, termFilter, yearFilter, subjectFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      const dateA = a.examDate ? new Date(a.examDate).getTime() : 0;
      const dateB = b.examDate ? new Date(b.examDate).getTime() : 0;
      return dateB - dateA;
    });
  }, [filtered]);

  const stats = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const thisYear = exams.filter((e) => e.year === currentYear).length;
    const alSessions = exams.filter((e) => isAdvancedLevelGrade(e.grade)).length;
    const grades = new Set(exams.map((e) => e.grade)).size;
    return { total: exams.length, thisYear, alSessions, grades };
  }, [exams]);

  const grouped = useMemo(() => {
    return sorted.reduce<Record<number, Examination[]>>((acc, exam) => {
      if (!acc[exam.year]) acc[exam.year] = [];
      acc[exam.year].push(exam);
      return acc;
    }, {});
  }, [sorted]);

  const years = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => b - a);

  const hasFilters =
    search.trim() !== '' ||
    gradeFilter !== EXAM_FILTER_ALL ||
    termFilter !== EXAM_FILTER_ALL ||
    yearFilter !== EXAM_FILTER_ALL ||
    subjectFilter !== EXAM_FILTER_ALL;

  const clearFilters = () => {
    onSearchChange('');
    onGradeFilterChange(EXAM_FILTER_ALL);
    onTermFilterChange(EXAM_FILTER_ALL);
    onYearFilterChange(EXAM_FILTER_ALL);
    onSubjectFilterChange?.(EXAM_FILTER_ALL);
  };

  const subjectFilterRow =
    subjectFilterOptions && subjectFilterOptions.length > 0 && onSubjectFilterChange ? (
      <FilterRow label={subjectFilterLabel}>
        <FilterPill
          active={subjectFilter === EXAM_FILTER_ALL}
          onClick={() => onSubjectFilterChange(EXAM_FILTER_ALL)}
        >
          All subjects
        </FilterPill>
        {subjectFilterOptions.map((subject) => (
          <FilterPill
            key={subject}
            active={subjectFilter === subject}
            onClick={() => onSubjectFilterChange(subject)}
          >
            {subject}
          </FilterPill>
        ))}
      </FilterRow>
    ) : null;

  return (
    <div className="directory-root">
      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        className="directory-stats-strip shrink-0"
      >
        <StatCard
          label="Total examinations"
          value={stats.total}
          icon={BookOpen}
          accent="from-violet-600 to-violet-800"
        />
        <StatCard
          label={`${new Date().getFullYear()} sessions`}
          value={stats.thisYear}
          icon={CalendarDays}
          accent="from-purple-500 to-purple-700"
        />
        <StatCard
          label="A/L sessions"
          value={stats.alSessions}
          icon={GraduationCap}
          accent="from-indigo-500 to-indigo-700"
          sub="Grade 12 & 13"
        />
        <StatCard
          label="Grades covered"
          value={stats.grades}
          icon={Layers}
          accent="from-fuchsia-500 to-fuchsia-700"
        />
      </motion.div>

      <div className="shrink-0 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm ring-1 ring-black/[0.02] sm:p-4">
        <div className="directory-toolbar">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search name, grade, stream, term, or year…"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-11 border-slate-200 bg-slate-50/50 pl-9 text-base focus-visible:ring-violet-500/30 sm:h-10 sm:text-sm"
            />
          </div>

          <div className="directory-toolbar-actions">
            <div className="flex w-full rounded-lg border border-slate-200 bg-slate-50 p-0.5 sm:w-auto">
              <button
                type="button"
                onClick={() => onViewModeChange('list')}
                className={cn(
                  'touch-target-pill flex flex-1 items-center justify-center gap-1 rounded-md px-3 text-xs font-semibold transition-colors sm:flex-none',
                  viewMode === 'list'
                    ? 'bg-white text-violet-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800',
                )}
                aria-pressed={viewMode === 'list'}
              >
                <List className="h-4 w-4" /> List
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange('grid')}
                className={cn(
                  'touch-target-pill flex flex-1 items-center justify-center gap-1 rounded-md px-3 text-xs font-semibold transition-colors sm:flex-none',
                  viewMode === 'grid'
                    ? 'bg-white text-violet-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800',
                )}
                aria-pressed={viewMode === 'grid'}
              >
                <LayoutGrid className="h-4 w-4" /> Grid
              </button>
            </div>

            {canManage && (
              <Button
                size="sm"
                className="min-h-[44px] w-full gap-1.5 bg-violet-700 hover:bg-violet-800 sm:min-h-10 sm:w-auto"
                asChild
              >
                <Link href="/dashboard/examinations/new">
                  <Plus className="h-4 w-4" />
                  <span className="hidden xs:inline">New examination</span>
                  <span className="xs:hidden">New</span>
                </Link>
              </Button>
            )}
          </div>
        </div>

        <details className="group mt-2.5 lg:hidden">
          <summary className="cursor-pointer list-none text-xs font-bold uppercase tracking-wide text-slate-500 [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5">
              Filters
              {hasFilters && (
                <span className="rounded-full bg-violet-600 px-1.5 py-px text-[9px] font-bold text-white">
                  on
                </span>
              )}
            </span>
          </summary>
          <div className="mt-2 space-y-2 border-t border-slate-100 pt-2">
            <FilterRow label="Year">
              <FilterPill
                active={yearFilter === EXAM_FILTER_ALL}
                onClick={() => onYearFilterChange(EXAM_FILTER_ALL)}
              >
                All years
              </FilterPill>
              {yearOptions.map((y) => (
                <FilterPill
                  key={y}
                  active={yearFilter === String(y)}
                  onClick={() => onYearFilterChange(String(y))}
                >
                  {y}
                </FilterPill>
              ))}
            </FilterRow>
            <FilterRow label={gradeFilterLabel}>
              <FilterPill
                active={gradeFilter === EXAM_FILTER_ALL}
                onClick={() => onGradeFilterChange(EXAM_FILTER_ALL)}
              >
                All grades
              </FilterPill>
              {gradeOptions.map((g) => (
                <FilterPill
                  key={g}
                  active={gradeFilter === g}
                  onClick={() => onGradeFilterChange(g)}
                >
                  {g.replace('Grade ', 'G')}
                </FilterPill>
              ))}
            </FilterRow>
            {subjectFilterRow}
            <FilterRow label="Term">
              <FilterPill
                active={termFilter === EXAM_FILTER_ALL}
                onClick={() => onTermFilterChange(EXAM_FILTER_ALL)}
              >
                All terms
              </FilterPill>
              {EXAM_TERM_OPTIONS.map((t) => (
                <FilterPill
                  key={t.value}
                  active={termFilter === t.value}
                  onClick={() => onTermFilterChange(t.value)}
                >
                  {t.label}
                </FilterPill>
              ))}
            </FilterRow>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-semibold text-violet-700 underline-offset-2 hover:text-violet-900 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </details>

        <div className="mt-3 hidden space-y-2 lg:block">
          <FilterRow label="Year">
            <FilterPill
              active={yearFilter === EXAM_FILTER_ALL}
              onClick={() => onYearFilterChange(EXAM_FILTER_ALL)}
            >
              All years
            </FilterPill>
            {yearOptions.map((y) => (
              <FilterPill
                key={y}
                active={yearFilter === String(y)}
                onClick={() => onYearFilterChange(String(y))}
              >
                {y}
              </FilterPill>
            ))}
          </FilterRow>
          <FilterRow label={gradeFilterLabel}>
            <FilterPill
              active={gradeFilter === EXAM_FILTER_ALL}
              onClick={() => onGradeFilterChange(EXAM_FILTER_ALL)}
            >
              All grades
            </FilterPill>
            {gradeOptions.map((g) => (
              <FilterPill
                key={g}
                active={gradeFilter === g}
                onClick={() => onGradeFilterChange(g)}
              >
                {g}
              </FilterPill>
            ))}
          </FilterRow>
          {subjectFilterRow}
          <FilterRow label="Term">
            <FilterPill
              active={termFilter === EXAM_FILTER_ALL}
              onClick={() => onTermFilterChange(EXAM_FILTER_ALL)}
            >
              All terms
            </FilterPill>
            {EXAM_TERM_OPTIONS.map((t) => (
              <FilterPill
                key={t.value}
                active={termFilter === t.value}
                onClick={() => onTermFilterChange(t.value)}
              >
                {t.label}
              </FilterPill>
            ))}
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="ml-1 text-xs font-semibold text-violet-700 underline-offset-2 hover:text-violet-900 hover:underline"
              >
                Clear filters
              </button>
            )}
          </FilterRow>
        </div>

        <div className="mt-3 border-t border-slate-100 pt-3">
          <ExamCurriculumPanel compact defaultBand="grades_6_9" />
        </div>
      </div>

      <div className="directory-panel ring-1 ring-black/[0.02]">
        <DirectoryPanelHeader
          title="Examination directory"
          count={filtered.length}
          countLabel="examination"
          loading={loading}
        />
        <div className="directory-panel-scroll">
          {loading ? (
            <DirectorySkeleton label="Loading examinations…" />
          ) : filtered.length === 0 ? (
            <EmptyState canManage={canManage} hasFilters={hasFilters} onClear={clearFilters} />
          ) : viewMode === 'grid' ? (
            <div className="space-y-6 p-2 sm:p-3">
              {years.map((year) => (
                <section key={year}>
                  <YearHeading year={year} count={grouped[year].length} />
                  <div className="grid grid-cols-1 gap-2 xs:gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    <AnimatePresence mode="popLayout">
                      {grouped[year].map((exam, index) => (
                        <ExamGridCard
                          key={exam.id}
                          exam={exam}
                          index={index}
                          canManage={canManage}
                          onDelete={onDelete}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="space-y-4 p-0 sm:p-1">
              {years.map((year) => (
                <section
                  key={year}
                  className="overflow-hidden rounded-xl border border-slate-200/80 bg-white sm:rounded-2xl"
                >
                  <YearHeading
                    year={year}
                    count={grouped[year].length}
                    className="border-b border-slate-100 bg-slate-50/80 px-3 py-2 sm:px-4 sm:py-2.5"
                  />
                  <ul className="divide-y divide-slate-100">
                    <AnimatePresence mode="popLayout">
                      {grouped[year].map((exam, index) => (
                        <ExamListRow
                          key={exam.id}
                          exam={exam}
                          index={index}
                          canManage={canManage}
                          onDelete={onDelete}
                        />
                      ))}
                    </AnimatePresence>
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  sub,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  accent: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 shadow-sm">
      <StatIconBadge icon={Icon} accent={accent} />
      <div className="min-w-0">
        <p className="truncate text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="text-xl font-extrabold leading-tight text-slate-900">{value}</p>
        {sub && <p className="truncate text-[10px] text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:thin]">
      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      {children}
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'touch-target-pill shrink-0 rounded-full px-3 text-xs font-semibold transition-all',
        active
          ? 'bg-violet-700 text-white shadow-sm shadow-violet-900/20'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900',
      )}
    >
      {children}
    </button>
  );
}

function YearHeading({
  year,
  count,
  className,
}: {
  year: number;
  count: number;
  className?: string;
}) {
  return (
    <div className={cn('mb-0 flex items-center gap-2', className)}>
      <span className="text-xs font-black uppercase tracking-widest text-violet-700">{year}</span>
      <span className="h-px flex-1 bg-violet-200" />
      <span className="text-[10px] font-semibold text-slate-400">
        {count} exam{count !== 1 ? 's' : ''}
      </span>
    </div>
  );
}

function ExamMeta({ exam }: { exam: Examination }) {
  const subjectCount = countCurriculumSubjects(exam.grade, exam.section);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge className="border-violet-200 bg-violet-50 text-[10px] font-semibold text-violet-800 hover:bg-violet-50">
        {exam.grade}
      </Badge>
      {exam.section && (
        <Badge variant="outline" className="max-w-[12rem] truncate border-slate-200 text-[10px]">
          {formatClassSection(exam.grade, exam.section)}
        </Badge>
      )}
      <Badge variant="outline" className="border-purple-200 text-[10px] text-purple-700">
        {exam.term}
      </Badge>
      {isGrade12to13(exam.grade) && subjectCount > 0 && (
        <Badge variant="secondary" className="text-[10px]">
          {subjectCount} subjects
        </Badge>
      )}
      <span className="text-[11px] text-slate-500">
        {exam.examDate ? formatDate(exam.examDate) : 'Date not set'}
        {!isGrade12to13(exam.grade) && subjectCount > 0 && <> · {subjectCount} subjects</>}
      </span>
    </div>
  );
}

function ExamGridCard({
  exam,
  index,
  canManage,
  onDelete,
}: {
  exam: Examination;
  index: number;
  canManage: boolean;
  onDelete: (id: string) => void | Promise<void>;
}) {
  return (
    <motion.article
      layout
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: Math.min(index * 0.04, 0.24), duration: 0.28 }}
      className="group flex flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-black/[0.02] transition-all hover:border-violet-200 hover:shadow-md sm:rounded-2xl"
    >
      <div className="h-1 accent-bar-violet" />
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <div className="mb-2 flex items-start justify-between gap-2 sm:mb-3 sm:gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-sm font-extrabold leading-snug text-slate-900 group-hover:text-violet-900 sm:text-base">
              {exam.examName}
            </h3>
            <p className="mt-0.5 text-[11px] font-medium text-slate-400">{exam.year}</p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 ring-1 ring-violet-100 sm:h-11 sm:w-11">
            <BookOpen className="h-4 w-4 text-violet-700 sm:h-5 sm:w-5" />
          </div>
        </div>
        <ExamMeta exam={exam} />
        {exam.description && (
          <p className="mt-2 line-clamp-2 text-xs text-slate-500">{exam.description}</p>
        )}
        <div className="mt-3 flex items-center gap-2 pt-1 sm:mt-4">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="min-h-10 flex-1 border-violet-200 text-violet-800 hover:bg-violet-50"
          >
            <Link href={`/dashboard/examinations/${exam.id}`}>
              <Eye className="h-3.5 w-3.5" />
              View results
            </Link>
          </Button>
          {canManage && <ExamManageActions exam={exam} onDelete={onDelete} compact />}
        </div>
      </div>
    </motion.article>
  );
}

function ExamListRow({
  exam,
  index,
  canManage,
  onDelete,
}: {
  exam: Examination;
  index: number;
  canManage: boolean;
  onDelete: (id: string) => void | Promise<void>;
}) {
  const subjectCount = countCurriculumSubjects(exam.grade, exam.section);

  return (
    <motion.li
      layout
      initial={false}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      transition={{ delay: Math.min(index * 0.02, 0.3), duration: 0.25 }}
      className="group list-none"
    >
      <div className="flex items-center gap-2 px-3 py-2.5 transition-colors hover:bg-violet-50/40 sm:gap-3 sm:px-4 sm:py-3">
        <Link
          href={`/dashboard/examinations/${exam.id}`}
          className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 ring-1 ring-violet-100 sm:h-11 sm:w-11">
            <BookOpen className="h-4 w-4 text-violet-700 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-900 group-hover:text-violet-900">
              {exam.examName}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <Badge className="h-5 border-violet-200 bg-violet-50 px-1.5 text-[10px] text-violet-800 hover:bg-violet-50">
                {exam.grade}
              </Badge>
              {exam.section && (
                <span className="max-w-[10rem] truncate text-[11px] font-medium text-slate-600 sm:max-w-none">
                  {formatClassSection(exam.grade, exam.section)}
                </span>
              )}
              <span className="text-[11px] text-slate-400">·</span>
              <span className="text-[11px] font-medium text-purple-700">{exam.term}</span>
              <span className="hidden text-[11px] text-slate-400 sm:inline">·</span>
              <span className="hidden text-[11px] text-slate-500 sm:inline">
                {exam.examDate ? formatDate(exam.examDate) : 'No date'}
              </span>
              {subjectCount > 0 && (
                <>
                  <span className="hidden text-[11px] text-slate-400 md:inline">·</span>
                  <span className="hidden text-[11px] text-slate-500 md:inline">
                    {subjectCount} subject{subjectCount !== 1 ? 's' : ''}
                  </span>
                </>
              )}
            </div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-violet-600 sm:hidden" />
        </Link>
        <div className="flex shrink-0 items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-9 w-9" asChild title="View results">
            <Link href={`/dashboard/examinations/${exam.id}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
          {canManage && <ExamManageActions exam={exam} onDelete={onDelete} />}
        </div>
      </div>
    </motion.li>
  );
}

function ExamManageActions({
  exam,
  onDelete,
  compact = false,
}: {
  exam: Examination;
  onDelete: (id: string) => void | Promise<void>;
  compact?: boolean;
}) {
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className={cn('h-9 w-9', compact && 'hidden xs:inline-flex')}
        asChild
        title="Edit examination"
      >
        <Link href={`/dashboard/examinations/${exam.id}/edit`}>
          <Pencil className="h-4 w-4" />
        </Link>
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-red-500 hover:bg-red-50 hover:text-red-700"
            title="Delete examination"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete examination</AlertDialogTitle>
            <AlertDialogDescription>
              Delete <strong>{exam.examName}</strong>? All associated results will also be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void onDelete(exam.id)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function EmptyState({
  canManage,
  hasFilters,
  onClear,
}: {
  canManage: boolean;
  hasFilters: boolean;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100">
        {hasFilters ? (
          <Search className="h-7 w-7 text-violet-500" />
        ) : (
          <Sparkles className="h-7 w-7 text-violet-500" />
        )}
      </div>
      <p className="text-base font-bold text-slate-900">
        {hasFilters ? 'No matching examinations' : 'No examinations yet'}
      </p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        {hasFilters
          ? 'Try changing search or filter options.'
          : canManage
            ? 'Create your first examination to start recording student results.'
            : 'Examinations will appear here when they are published by staff.'}
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {hasFilters && (
          <Button variant="outline" size="sm" onClick={onClear}>
            Clear filters
          </Button>
        )}
        {canManage && !hasFilters && (
          <Button size="sm" className="bg-violet-700 hover:bg-violet-800" asChild>
            <Link href="/dashboard/examinations/new">
              <Plus className="h-4 w-4" />
              New examination
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
