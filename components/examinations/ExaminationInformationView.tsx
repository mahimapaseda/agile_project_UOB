'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  ClipboardList,
  Users,
  BarChart3,
  Search,
  GraduationCap,
  TrendingUp,
  TrendingDown,
  Filter,
  Sparkles,
  BookMarked,
  Download,
  ChevronRight,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { PageMain } from '@/components/layout/PageMain';
import { DirectoryPanelHeader } from '@/components/layout/DirectoryPanelHeader';
import { ResponsiveTable } from '@/components/layout/ResponsiveTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getExaminations, getResults, getStaffList } from '@/lib/firestore';
import { ExamResult, Examination, Staff } from '@/types';
import { TeacherSubjectDetailDialog } from '@/components/examinations/TeacherSubjectDetailDialog';
import { GradeSubjectDetailDialog } from '@/components/examinations/GradeSubjectDetailDialog';
import { ExaminationSearchPicker } from '@/components/examinations/ExaminationSearchPicker';
import { RecordExportDialog } from '@/components/export/RecordExportDialog';
import {
  buildExamInfoExportPrefix,
  buildExamInfoExportTitle,
  EXAM_INFO_GRADE_EXPORT_FIELDS,
  EXAM_INFO_TEACHER_EXPORT_FIELDS,
  filterGradeRowsForExport,
  filterTeacherRowsForExport,
} from '@/lib/examination-information-export';
import {
  buildExamReportTitle,
  buildGradeSubjectAnalysis,
  buildTeacherSubjectAnalysis,
  formatPct,
  SCORE_BANDS,
  type GradeSubjectAnalysisRow,
  type TeacherSubjectAnalysisRow,
} from '@/lib/examination-information';
import { cn } from '@/lib/utils';
import { solidAccentFromGradient } from '@/lib/stat-icon-accent';
import { formatClassSection } from '@/lib/grade-class-options';

type ReportTab = 'teachers' | 'grades';

const FILTER_ALL = 'all';

interface ExaminationInformationViewProps {
  subtitle?: string;
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/10 p-3 text-white shadow-lg sm:p-4',
        solidAccentFromGradient(accent),
      )}
    >
      <div className="relative flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-bold uppercase tracking-wider text-white/75 sm:text-[11px]">
            {label}
          </p>
          <p className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{value}</p>
          {sub && <p className="mt-0.5 truncate text-[10px] font-medium text-white/70">{sub}</p>}
        </div>
        <div className="stat-icon-badge flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/20 sm:h-11 sm:w-11">
          <Icon className="stat-icon-badge__svg h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
        </div>
      </div>
    </motion.div>
  );
}

function BandChip({ band, count }: { band: string; count: number }) {
  const colors: Record<string, string> = {
    '0-19': 'bg-rose-100 text-rose-800 ring-rose-200',
    '20-39': 'bg-orange-100 text-orange-800 ring-orange-200',
    '40-54': 'bg-amber-100 text-amber-800 ring-amber-200',
    '55-64': 'bg-sky-100 text-sky-800 ring-sky-200',
    '65-74': 'bg-blue-100 text-blue-800 ring-blue-200',
    '75-100': 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  };
  return (
    <span
      className={cn(
        'inline-flex min-w-[2rem] items-center justify-center rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold ring-1',
        count > 0 ? colors[band] ?? 'bg-slate-100 text-slate-700' : 'bg-slate-50 text-slate-300 ring-slate-100',
      )}
    >
      {count}
    </span>
  );
}

function TeacherReportCard({
  row,
  onSelect,
}: {
  row: TeacherSubjectAnalysisRow;
  onSelect: (row: TeacherSubjectAnalysisRow) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(row)}
      className="flex w-full flex-col gap-3 border-b border-slate-100 px-4 py-4 text-left transition-colors hover:bg-violet-50/40 active:bg-violet-50/60"
    >
      <div className="flex items-start justify-between gap-2">
        <Badge className="border-violet-200 bg-violet-50 font-semibold text-violet-900 hover:bg-violet-50">
          {row.subject}
        </Badge>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
      </div>
      <div>
        <p className="font-semibold leading-snug text-slate-900">{row.teacherName}</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">{row.teachingGrades}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <div className="rounded-lg bg-slate-50 px-2.5 py-2">
          <p className="text-slate-500">Students</p>
          <p className="mt-0.5 font-bold tabular-nums text-slate-900">{row.totalStudents}</p>
        </div>
        <div className="rounded-lg bg-rose-50 px-2.5 py-2">
          <p className="text-rose-600">Below 40</p>
          <p className="mt-0.5 font-bold tabular-nums text-rose-700">
            {row.below40} ({formatPct(row.below40Pct)})
          </p>
        </div>
        <div className="rounded-lg bg-emerald-50 px-2.5 py-2 sm:col-span-2">
          <p className="text-emerald-600">Above 40</p>
          <p className="mt-0.5 font-bold tabular-nums text-emerald-700">
            {row.above40} ({formatPct(row.above40Pct)})
          </p>
        </div>
      </div>
    </button>
  );
}

function GradeReportCard({
  row,
  onSelect,
}: {
  row: GradeSubjectAnalysisRow;
  onSelect: (row: GradeSubjectAnalysisRow) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(row)}
      className="flex w-full flex-col gap-3 border-b border-slate-100 px-4 py-4 text-left transition-colors hover:bg-violet-50/40 active:bg-violet-50/60"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-900">{row.subject}</span>
          <Badge variant="outline" className="text-[10px]">
            {row.grade}
          </Badge>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
      </div>
      <p className="text-sm leading-snug text-slate-700">{row.teacherName}</p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-slate-50 px-2.5 py-2">
          <p className="text-slate-500">In class</p>
          <p className="mt-0.5 font-bold tabular-nums">{row.studentsInClass}</p>
        </div>
        <div className="rounded-lg bg-slate-50 px-2.5 py-2">
          <p className="text-slate-500">Appeared</p>
          <p className="mt-0.5 font-bold tabular-nums">{row.appeared}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {SCORE_BANDS.map((band) => (
          <BandChip key={band} band={band} count={row.bands[band]} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-rose-50 px-2.5 py-2">
          <p className="text-rose-600">Below 40</p>
          <p className="mt-0.5 font-bold tabular-nums text-rose-700">
            {row.below40} ({formatPct(row.below40Pct)})
          </p>
        </div>
        <div className="rounded-lg bg-emerald-50 px-2.5 py-2">
          <p className="text-emerald-600">Above 40</p>
          <p className="mt-0.5 font-bold tabular-nums text-emerald-700">
            {row.above40} ({formatPct(row.above40Pct)})
          </p>
        </div>
      </div>
    </button>
  );
}

function TeacherAnalysisPanel({
  rows,
  search,
  onSelectRow,
}: {
  rows: TeacherSubjectAnalysisRow[];
  search: string;
  onSelectRow: (row: TeacherSubjectAnalysisRow) => void;
}) {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.subject.toLowerCase().includes(q) ||
        r.teacherName.toLowerCase().includes(q) ||
        r.teachingGrades.toLowerCase().includes(q),
    );
  }, [rows, search]);

  if (!rows.length) {
    return <EmptyReport message="No subject results found for this examination." />;
  }

  if (!filtered.length) {
    return <EmptyReport message="No rows match your search." />;
  }

  return (
    <>
      <ul className="divide-y divide-slate-100 lg:hidden">
        {filtered.map((row) => (
          <li key={`${row.subject}-${row.teacherName}`}>
            <TeacherReportCard row={row} onSelect={onSelectRow} />
          </li>
        ))}
      </ul>

      <div className="hidden lg:block">
        <ResponsiveTable showHint={false}>
          <table className="w-full min-w-[960px] border-collapse text-left text-sm">
            <thead className="surface-muted sticky top-0 z-10">
              <tr className="border-b border-slate-200">
                <Th>Subject</Th>
                <Th>Name of the teacher</Th>
                <Th>Teaching grades</Th>
                <Th className="text-right">No of students</Th>
                <Th className="text-right">No of students below 35</Th>
                <Th className="text-right">Percentage of below 35</Th>
                <Th className="text-right">No of students above 35</Th>
                <Th className="text-right">Percentage of above 35</Th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {filtered.map((row, i) => (
                  <motion.tr
                    key={`${row.subject}-${row.teacherName}`}
                    layout
                    initial={false}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.2) }}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectRow(row)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectRow(row);
                      }
                    }}
                    className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-violet-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-400"
                  >
                    <td className="px-4 py-3">
                      <Badge className="border-violet-200 bg-violet-50 font-semibold text-violet-900 hover:bg-violet-50">
                        {row.subject}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{row.teacherName}</p>
                    </td>
                    <td className="max-w-[11rem] px-4 py-3 text-xs leading-relaxed text-slate-600">
                      {row.teachingGrades}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-bold text-slate-800">
                      {row.totalStudents}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-rose-700">
                      {row.below40}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-rose-600">
                      {formatPct(row.below40Pct)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-emerald-700">
                      {row.above40}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-emerald-600">
                      {formatPct(row.above40Pct)}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </ResponsiveTable>
      </div>
    </>
  );
}

function GradeAnalysisPanel({
  rows,
  search,
  gradeFilter,
  onSelectRow,
}: {
  rows: GradeSubjectAnalysisRow[];
  search: string;
  gradeFilter: string;
  onSelectRow: (row: GradeSubjectAnalysisRow) => void;
}) {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (gradeFilter !== FILTER_ALL && r.grade !== gradeFilter) return false;
      if (!q) return true;
      return (
        r.subject.toLowerCase().includes(q) ||
        r.teacherName.toLowerCase().includes(q) ||
        r.grade.toLowerCase().includes(q)
      );
    });
  }, [rows, search, gradeFilter]);

  if (!rows.length) {
    return <EmptyReport message="No grade-level subject results found." />;
  }

  if (!filtered.length) {
    return <EmptyReport message="No rows match your filters." />;
  }

  return (
    <>
      <ul className="divide-y divide-slate-100 lg:hidden">
        {filtered.map((row, i) => (
          <li key={`${row.subject}-${row.grade}-${row.teacherName}-${i}`}>
            <GradeReportCard row={row} onSelect={onSelectRow} />
          </li>
        ))}
      </ul>

      <div className="hidden lg:block">
        <ResponsiveTable showHint={false}>
          <table className="w-full min-w-[1200px] border-collapse text-left text-sm">
            <thead className="surface-muted sticky top-0 z-10">
              <tr className="border-b border-slate-200">
                <Th>Subject</Th>
                <Th>Grade</Th>
                <Th>Name of the teacher</Th>
                <Th className="text-right">No of students in the class</Th>
                <Th className="text-right">Number of students who appeared</Th>
                {SCORE_BANDS.map((b) => (
                  <Th key={b} className="text-center">
                    {b}
                  </Th>
                ))}
                <Th className="text-right">No of students below 35</Th>
                <Th className="text-right">Percentage of below 35</Th>
                <Th className="text-right">No of students above 35</Th>
                <Th className="text-right">Percentage of above 35</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <motion.tr
                  key={`${row.subject}-${row.grade}-${row.teacherName}-${i}`}
                  initial={false}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.015, 0.15) }}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectRow(row)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectRow(row);
                    }
                  }}
                  className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-violet-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-400"
                >
                  <td className="px-3 py-2.5 font-semibold text-slate-900">{row.subject}</td>
                  <td className="px-3 py-2.5">
                    <Badge variant="outline" className="text-[10px]">
                      {row.grade}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-slate-800">{row.teacherName}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                    {row.studentsInClass}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-slate-900">
                    {row.appeared}
                  </td>
                  {SCORE_BANDS.map((band) => (
                    <td key={band} className="px-2 py-2.5 text-center">
                      <BandChip band={band} count={row.bands[band]} />
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-rose-700">
                    {row.below40}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-rose-600">
                    {formatPct(row.below40Pct)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-emerald-700">
                    {row.above40}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-emerald-600">
                    {formatPct(row.above40Pct)}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </ResponsiveTable>
      </div>
    </>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        'whitespace-nowrap px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:px-4 sm:text-[11px]',
        className,
      )}
    >
      {children}
    </th>
  );
}

function EmptyReport({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-violet-200/80 bg-violet-50 px-6 py-16 text-center">
      <Filter className="mb-3 h-8 w-8 text-violet-400" />
      <p className="text-sm font-medium text-slate-600">{message}</p>
    </div>
  );
}

export function ExaminationInformationView(_props: ExaminationInformationViewProps) {
  const [exams, setExams] = useState<Examination[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);
  const [tab, setTab] = useState<ReportTab>('teachers');
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState(FILTER_ALL);
  const [selectedTeacherRow, setSelectedTeacherRow] = useState<TeacherSubjectAnalysisRow | null>(
    null,
  );
  const [selectedGradeRow, setSelectedGradeRow] = useState<GradeSubjectAnalysisRow | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    Promise.all([getExaminations(), getStaffList(undefined, 'active')]).then(([examList, staffList]) => {
      setExams(examList);
      setStaff(staffList);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedExamId) {
      setResults([]);
      return;
    }
    const exam = exams.find((e) => e.id === selectedExamId);
    if (!exam) return;

    setLoadingResults(true);
    getResults(selectedExamId)
      .then(setResults)
      .finally(() => setLoadingResults(false));
  }, [selectedExamId, exams]);

  useEffect(() => {
    setSearch('');
    setGradeFilter(FILTER_ALL);
    setSelectedTeacherRow(null);
    setSelectedGradeRow(null);
    setExportOpen(false);
  }, [selectedExamId, tab]);

  const selectedExam = exams.find((e) => e.id === selectedExamId) ?? null;

  const teacherRows = useMemo(
    () => (results.length ? buildTeacherSubjectAnalysis(results, staff) : []),
    [results, staff],
  );

  const gradeRows = useMemo(
    () => (results.length ? buildGradeSubjectAnalysis(results, staff) : []),
    [results, staff],
  );

  const gradeOptions = useMemo(
    () => [...new Set(gradeRows.map((r) => r.grade))].sort(),
    [gradeRows],
  );

  const exportTeacherRows = useMemo(
    () => filterTeacherRowsForExport(teacherRows, search),
    [teacherRows, search],
  );

  const exportGradeRows = useMemo(
    () => filterGradeRowsForExport(gradeRows, search, gradeFilter),
    [gradeRows, search, gradeFilter],
  );

  const exportRecordCount = tab === 'teachers' ? exportTeacherRows.length : exportGradeRows.length;
  const canExport = Boolean(selectedExamId && !loadingResults && exportRecordCount > 0);

  const stats = useMemo(() => {
    const subjects = new Set(teacherRows.map((r) => r.subject)).size;
    const teachers = new Set(teacherRows.map((r) => r.teacherName)).size;
    const totalEntries = teacherRows.reduce((s, r) => s + r.totalStudents, 0);
    const totalAbove = teacherRows.reduce((s, r) => s + r.above40, 0);
    const passRate = totalEntries ? Math.round((totalAbove / totalEntries) * 1000) / 10 : 0;
    return { subjects, teachers, students: results.length, passRate, rows: teacherRows.length };
  }, [teacherRows, results.length]);

  const reportTitle = selectedExam ? buildExamReportTitle(selectedExam) : 'Examination information';

  const headerSubtitle = loading
    ? 'Loading reports…'
    : selectedExam
      ? `${reportTitle} · ${results.length} student${results.length !== 1 ? 's' : ''}`
      : 'Select an examination';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Header title="Examination Information" subtitle={headerSubtitle} />

      <PageMain flexContent className="flex flex-col">
        <div className="directory-root">
          {!loading && exams.length > 0 && selectedExamId && (
            <motion.div
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              className="directory-stats-strip shrink-0"
            >
              <StatCard
                label="Subjects analyzed"
                value={stats.subjects}
                sub={`${stats.rows} teacher rows`}
                icon={BookMarked}
                accent="from-violet-600 to-purple-800"
              />
              <StatCard
                label="Teachers"
                value={stats.teachers}
                icon={Users}
                accent="from-indigo-500 to-indigo-700"
              />
              <StatCard
                label="Student results"
                value={stats.students}
                icon={GraduationCap}
                accent="from-purple-500 to-fuchsia-700"
              />
              <StatCard
                label="Pass rate ≥35%"
                value={formatPct(stats.passRate)}
                sub="Across subject entries"
                icon={stats.passRate >= 50 ? TrendingUp : TrendingDown}
                accent={
                  stats.passRate >= 75
                    ? 'from-emerald-500 to-green-700'
                    : stats.passRate >= 50
                      ? 'from-amber-500 to-orange-600'
                      : 'from-rose-500 to-red-700'
                }
              />
            </motion.div>
          )}

          <motion.section
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="surface-exam relative shrink-0 overflow-visible rounded-2xl border border-violet-200/50 p-4 shadow-xl shadow-violet-900/20 sm:p-6"
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-fuchsia-400/20 blur-3xl" />
            </div>
            <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-violet-200">
                  <ClipboardList className="h-3.5 w-3.5" />
                  Leadership reports
                </div>
                <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">
                  {selectedExam ? selectedExam.examName : 'Subject analysis'}
                </h2>
                <p className="mt-1 text-sm text-violet-200/90">
                  {selectedExam
                    ? `${selectedExam.year} · ${selectedExam.term} · ${selectedExam.grade}${
                        selectedExam.section
                          ? ` · ${formatClassSection(selectedExam.grade, selectedExam.section)}`
                          : ''
                      }`
                    : 'Choose an examination to generate teacher and grade band reports.'}
                </p>
              </div>
              <div className="w-full min-w-0 lg:max-w-md">
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-violet-300">
                  Examination
                </label>
                <ExaminationSearchPicker
                  exams={exams}
                  value={selectedExamId}
                  onValueChange={setSelectedExamId}
                  disabled={!exams.length}
                  variant="hero"
                />
              </div>
            </div>
          </motion.section>

          <div className="shrink-0 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm ring-1 ring-black/[0.02] sm:p-4">
            <div className="directory-toolbar">
              <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
                {(
                  [
                    { id: 'teachers' as const, label: 'Part 1 · Teachers', icon: Users },
                    { id: 'grades' as const, label: 'Part 2 · Mark bands', icon: BarChart3 },
                  ] as const
                ).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    className={cn(
                      'flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold transition-all sm:flex-none sm:px-4 sm:text-sm',
                      tab === id
                        ? 'bg-white text-violet-800 shadow-sm ring-1 ring-violet-100'
                        : 'text-slate-500 hover:text-slate-800',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>

              <div className="directory-toolbar-actions">
                <div className="relative min-w-0 w-full flex-1 sm:min-w-[200px] sm:w-auto">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search subject or teacher…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-10 border-slate-200 bg-slate-50/50 pl-9 text-sm focus-visible:ring-violet-500/30"
                  />
                </div>
                {tab === 'grades' && gradeOptions.length > 1 && (
                  <Select value={gradeFilter} onValueChange={setGradeFilter}>
                    <SelectTrigger className="h-10 w-full border-slate-200 bg-slate-50/80 text-xs sm:w-32">
                      <SelectValue placeholder="Grade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={FILTER_ALL}>All grades</SelectItem>
                      {gradeOptions.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-full shrink-0 gap-1.5 border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto"
                  disabled={!canExport}
                  onClick={() => setExportOpen(true)}
                >
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>

            <p className="mt-3 text-[11px] leading-relaxed text-slate-500 sm:text-xs">
              {tab === 'teachers'
                ? 'Aggregated by subject and assigned teacher. Click any row for a full summary with student-level results.'
                : 'Mark bands as % of subject marks. Click any row for a full grade summary with student results and absent list.'}
            </p>
          </div>

          <div className="directory-panel min-h-0 flex-1 ring-1 ring-black/[0.02]">
            {selectedExamId && !loading && !loadingResults && exams.length > 0 && (
              <DirectoryPanelHeader
                title={tab === 'teachers' ? 'Part 1 · Teacher analysis' : 'Part 2 · Mark bands'}
                count={exportRecordCount}
                countLabel="row"
                loading={loadingResults}
                scrollHint={exportRecordCount > 0}
              />
            )}
            <div className="directory-panel-scroll">
              {loading ? (
                <LoadingState />
              ) : !exams.length ? (
                <EmptyState />
              ) : !selectedExamId ? (
                <SelectExamPrompt />
              ) : loadingResults ? (
                <LoadingState />
              ) : tab === 'teachers' ? (
                <TeacherAnalysisPanel
                  rows={teacherRows}
                  search={search}
                  onSelectRow={setSelectedTeacherRow}
                />
              ) : (
                <GradeAnalysisPanel
                  rows={gradeRows}
                  search={search}
                  gradeFilter={gradeFilter}
                  onSelectRow={setSelectedGradeRow}
                />
              )}
            </div>
          </div>
        </div>
      </PageMain>

      <TeacherSubjectDetailDialog
        open={selectedTeacherRow !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedTeacherRow(null);
        }}
        row={selectedTeacherRow}
        results={results}
        staff={staff}
        exam={selectedExam}
      />

      <GradeSubjectDetailDialog
        open={selectedGradeRow !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedGradeRow(null);
        }}
        row={selectedGradeRow}
        results={results}
        staff={staff}
        exam={selectedExam}
      />

      {selectedExam && tab === 'teachers' && (
        <RecordExportDialog
          open={exportOpen}
          onOpenChange={setExportOpen}
          title={buildExamInfoExportTitle(selectedExam, 'teachers')}
          records={exportTeacherRows}
          fields={EXAM_INFO_TEACHER_EXPORT_FIELDS}
          filePrefix={buildExamInfoExportPrefix(selectedExam, 'teachers')}
          defaultFormat="pdf"
        />
      )}
      {selectedExam && tab === 'grades' && (
        <RecordExportDialog
          open={exportOpen}
          onOpenChange={setExportOpen}
          title={buildExamInfoExportTitle(selectedExam, 'grades')}
          records={exportGradeRows}
          fields={EXAM_INFO_GRADE_EXPORT_FIELDS}
          filePrefix={buildExamInfoExportPrefix(selectedExam, 'grades')}
          defaultFormat="pdf"
        />
      )}
    </div>
  );
}

function SelectExamPrompt() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-violet-200/80 bg-violet-50 px-6 py-20 text-center">
      <ClipboardList className="mb-3 h-10 w-10 text-violet-400" />
      <p className="font-bold text-slate-800">Select an examination</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        Use the examination search above to choose an exam and generate subject analysis reports.
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center rounded-2xl border border-slate-200/80 bg-white py-20 shadow-sm">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-[3px] border-violet-200 border-t-violet-600" />
        <p className="text-sm font-medium text-slate-500">Building analysis…</p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-20 text-center shadow-sm">
      <Sparkles className="mb-3 h-10 w-10 text-slate-300" />
      <p className="font-bold text-slate-800">No examinations yet</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        Create an examination and add student results to generate subject analysis reports.
      </p>
      <BookOpen className="mt-4 h-5 w-5 text-slate-300" />
    </div>
  );
}
