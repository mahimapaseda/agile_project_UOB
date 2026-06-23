'use client';

import dynamic from 'next/dynamic';
import { memo, useMemo, useState } from 'react';
import { useWindowedList } from '@/lib/hooks/use-windowed-list';
import { LoadMoreBar } from '@/components/ui/LoadMoreBar';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Download,
  Eye,
  Pencil,
  Trash2,
  BarChart3,
  UserX,
  Upload,
  Users,
  UserCheck,
  GraduationCap,
  Filter,
  LayoutGrid,
  List,
  Phone,
  Mail,
  ChevronRight,
} from 'lucide-react';
import { DirectoryPanelHeader } from '@/components/layout/DirectoryPanelHeader';
import { MobileRowActions } from '@/components/layout/MobileRowActions';

import { RecordExportDialog } from '@/components/export/RecordExportDialog';

const StudentCsvImportDialog = dynamic(
  () =>
    import('@/components/students/StudentCsvImportDialog').then((m) => ({
      default: m.StudentCsvImportDialog,
    })),
  { ssr: false },
);
import { STUDENT_EXPORT_FIELDS, STUDENT_PDF_EXCLUDED_FIELD_KEYS } from '@/lib/record-export-fields';
import { StudentProfilePhoto } from '@/components/students/StudentProfilePhoto';
import { ContactActionLink } from '@/components/contact/ContactActionLink';
import { Button } from '@/components/ui/button';
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
import { Student, GRADES } from '@/types';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { StatIconBadge } from '@/components/ui/StatIconBadge';
import { DirectorySkeleton } from '@/components/ui/DirectorySkeleton';

type StatusVariant = 'success' | 'secondary' | 'default' | 'warning';
type ViewMode = 'list' | 'grid';

const FILTER_ALL = 'all';

const statusVariants: Record<Student['status'], StatusVariant> = {
  active: 'success',
  inactive: 'secondary',
  graduated: 'default',
  transferred: 'warning',
};

const STATUS_OPTIONS = [
  { value: FILTER_ALL, label: 'All status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'graduated', label: 'Graduated' },
  { value: 'transferred', label: 'Transferred' },
] as const;

interface StudentsDirectoryProps {
  students: Student[];
  loading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  gradeFilter: string;
  onGradeFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  canManage: boolean;
  canViewExamAnalysis?: boolean;
  /** When set (e.g. teachers), only these grades appear in the grade filter. */
  gradeFilterOptions?: string[];
  restricted: boolean;
  deletingId: string | null;
  onDelete: (id: string) => void;
  csvImportOpen: boolean;
  onCsvImportOpenChange: (open: boolean) => void;
  onImported: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function StudentsDirectory({
  students,
  loading,
  search,
  onSearchChange,
  gradeFilter,
  onGradeFilterChange,
  statusFilter,
  onStatusFilterChange,
  canManage,
  canViewExamAnalysis = false,
  gradeFilterOptions,
  restricted,
  deletingId,
  onDelete,
  csvImportOpen,
  onCsvImportOpenChange,
  onImported,
  viewMode,
  onViewModeChange,
}: StudentsDirectoryProps) {
  const [exportOpen, setExportOpen] = useState(false);
  const { visible: visibleStudents, hasMore, loadMore, total, visibleCount } =
    useWindowedList(students);

  const stats = useMemo(() => {
    const active = students.filter((s) => s.status === 'active').length;
    const graduated = students.filter((s) => s.status === 'graduated').length;
    const other = students.length - active - graduated;
    const gradeCounts = students.reduce<Record<string, number>>((acc, s) => {
      acc[s.grade] = (acc[s.grade] ?? 0) + 1;
      return acc;
    }, {});
    const topGrade = Object.entries(gradeCounts).sort((a, b) => b[1] - a[1])[0];
    return { total: students.length, active, graduated, other, topGrade };
  }, [students]);

  const gradePills = gradeFilterOptions?.length
    ? GRADES.filter((g) => gradeFilterOptions.includes(g))
    : GRADES;

  const hasFilters =
    search.trim() !== '' || gradeFilter !== FILTER_ALL || statusFilter !== FILTER_ALL;

  const clearFilters = () => {
    onSearchChange('');
    onGradeFilterChange(FILTER_ALL);
    onStatusFilterChange(FILTER_ALL);
  };

  return (
    <div className="directory-root">
      {/* Stats */}
      {!restricted && (
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          className="directory-stats-strip shrink-0"
        >
          <StatCard
            label="Total enrolled"
            value={stats.total}
            icon={Users}
            accent="from-blue-600 to-blue-800"
          />
          <StatCard
            label="Active"
            value={stats.active}
            icon={UserCheck}
            accent="from-emerald-500 to-emerald-700"
          />
          <StatCard
            label="Graduated"
            value={stats.graduated}
            icon={GraduationCap}
            accent="from-violet-500 to-violet-700"
          />
          <StatCard
            label={stats.topGrade ? `Most in ${stats.topGrade[0]}` : 'Other status'}
            value={stats.topGrade ? stats.topGrade[1] : stats.other}
            icon={Filter}
            accent="from-amber-500 to-amber-600"
            sub={stats.topGrade ? 'students' : 'inactive / transferred'}
          />
        </motion.div>
      )}

      {/* Toolbar */}
      {!restricted && (
        <div className="shrink-0 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm ring-1 ring-black/[0.02] sm:p-4">
          <div className="directory-toolbar">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search name, index, email..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="h-11 border-slate-200 bg-slate-50/50 pl-9 text-base sm:h-10 sm:text-sm focus-visible:ring-blue-500/30"
              />
            </div>

            <div className="directory-toolbar-actions">
              <div className="flex w-full rounded-lg border border-slate-200 bg-slate-50 p-0.5 sm:w-auto">
                <button
                  type="button"
                  onClick={() => onViewModeChange('list')}
                  className={cn(
                    'touch-target-pill flex flex-1 items-center justify-center gap-1 rounded-md px-3 text-xs font-semibold transition-colors sm:flex-none',
                    viewMode === 'list' ? 'bg-white text-blue-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
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
                    viewMode === 'grid' ? 'bg-white text-blue-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  )}
                  aria-pressed={viewMode === 'grid'}
                >
                  <LayoutGrid className="h-4 w-4" /> Grid
                </button>
              </div>

              <Button variant="outline" size="sm" className="min-h-[44px] w-full gap-1.5 sm:min-h-10 sm:w-auto" onClick={() => setExportOpen(true)}>
                <Download className="h-4 w-4" />
                <span className="hidden xs:inline">Export</span>
              </Button>
              {canManage && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-[44px] gap-1.5 sm:min-h-10"
                    onClick={() => onCsvImportOpenChange(true)}
                  >
                    <Upload className="h-4 w-4" />
                    <span className="hidden xs:inline">CSV</span>
                  </Button>
                  <Button size="sm" className="min-h-[44px] gap-1.5 bg-blue-700 hover:bg-blue-800 sm:min-h-10" asChild>
                    <Link href="/dashboard/students/new">
                      <Plus className="h-4 w-4" />
                      <span className="hidden xs:inline">Add student</span>
                      <span className="xs:hidden">Add</span>
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Grade pills — collapsible on mobile */}
          <details className="group mt-2.5 lg:hidden">
            <summary className="cursor-pointer list-none text-xs font-bold uppercase tracking-wide text-slate-500 [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5">
                Filters
                {hasFilters && (
                  <span className="rounded-full bg-blue-700 px-1.5 py-px text-[9px] font-bold text-white">
                    on
                  </span>
                )}
              </span>
            </summary>
            <div className="mt-2 space-y-2 border-t border-slate-100 pt-2">
              <div className="flex items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:thin]">
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Grade
                </span>
                <FilterPill active={gradeFilter === FILTER_ALL} onClick={() => onGradeFilterChange(FILTER_ALL)}>
                  All
                </FilterPill>
                {gradePills.map((g) => (
                  <FilterPill
                    key={g}
                    active={gradeFilter === g}
                    onClick={() => onGradeFilterChange(gradeFilter === g ? FILTER_ALL : g)}
                  >
                    {g.replace('Grade ', 'G')}
                  </FilterPill>
                ))}
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:thin]">
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Status
                </span>
                {STATUS_OPTIONS.map((opt) => (
                  <FilterPill
                    key={opt.value}
                    active={statusFilter === opt.value}
                    onClick={() => onStatusFilterChange(opt.value)}
                  >
                    {opt.label}
                  </FilterPill>
                ))}
              </div>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-semibold text-blue-700 hover:text-blue-900 underline-offset-2 hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          </details>

          <div className="mt-3 hidden lg:block">
            <div className="flex items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:thin]">
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Grade
              </span>
              <FilterPill active={gradeFilter === FILTER_ALL} onClick={() => onGradeFilterChange(FILTER_ALL)}>
                All
              </FilterPill>
              {gradePills.map((g) => (
                <FilterPill
                  key={g}
                  active={gradeFilter === g}
                  onClick={() => onGradeFilterChange(gradeFilter === g ? FILTER_ALL : g)}
                >
                  {g.replace('Grade ', 'G')}
                </FilterPill>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Status
              </span>
              {STATUS_OPTIONS.map((opt) => (
                <FilterPill
                  key={opt.value}
                  active={statusFilter === opt.value}
                  onClick={() => onStatusFilterChange(opt.value)}
                >
                  {opt.label}
                </FilterPill>
              ))}
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-semibold text-blue-700 hover:text-blue-900 underline-offset-2 hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* List panel */}
      <div className="directory-panel ring-1 ring-black/[0.02]">
        <DirectoryPanelHeader
          title={restricted ? 'Your record' : 'Student directory'}
          count={students.length}
          loading={loading}
        />

        <div className="directory-panel-scroll">
          {loading ? (
            <DirectorySkeleton label="Loading students…" />
          ) : students.length === 0 ? (
            <EmptyState
              hasFilters={hasFilters}
              canManage={canManage}
              restricted={restricted}
              onClearFilters={clearFilters}
            />
          ) : viewMode === 'grid' && !restricted ? (
            <>
              <div className="grid grid-cols-2 gap-2 p-2 xs:gap-3 xs:p-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                <AnimatePresence mode="popLayout">
                  {visibleStudents.map((s, i) => (
                    <StudentGridCard
                      key={s.id}
                      student={s}
                      index={i}
                      canManage={canManage}
                      canViewExamAnalysis={canViewExamAnalysis}
                      deletingId={deletingId}
                      onDelete={onDelete}
                    />
                  ))}
                </AnimatePresence>
              </div>
              {hasMore && (
                <LoadMoreBar visibleCount={visibleCount} total={total} onLoadMore={loadMore} />
              )}
            </>
          ) : (
            <>
              <ul className="divide-y divide-slate-100">
                <AnimatePresence mode="popLayout">
                  {visibleStudents.map((s, i) => (
                    <StudentListRow
                      key={s.id}
                      student={s}
                      index={i}
                      canManage={canManage}
                      canViewExamAnalysis={canViewExamAnalysis}
                      deletingId={deletingId}
                      onDelete={onDelete}
                      compact={restricted}
                    />
                  ))}
                </AnimatePresence>
              </ul>
              {hasMore && (
                <LoadMoreBar visibleCount={visibleCount} total={total} onLoadMore={loadMore} />
              )}
            </>
          )}
        </div>
      </div>

      {canManage && (
        <StudentCsvImportDialog
          open={csvImportOpen}
          onClose={() => onCsvImportOpenChange(false)}
          onImported={onImported}
        />
      )}

      <RecordExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        title="Students"
        records={students}
        fields={STUDENT_EXPORT_FIELDS}
        defaultFormat="csv"
        pdfExcludedFieldKeys={STUDENT_PDF_EXCLUDED_FIELD_KEYS}
        csvExportsAllFields
        filePrefix="students-list"
      />
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
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="text-xl font-extrabold leading-tight text-slate-900">{value}</p>
        {sub && <p className="text-[10px] text-slate-400 truncate">{sub}</p>}
      </div>
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
          ? 'bg-blue-700 text-white shadow-sm shadow-blue-900/20'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
      )}
    >
      {children}
    </button>
  );
}

function EmptyState({
  hasFilters,
  canManage,
  restricted,
  onClearFilters,
}: {
  hasFilters: boolean;
  canManage: boolean;
  restricted: boolean;
  onClearFilters: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
        <UserX className="h-7 w-7 text-slate-400" />
      </div>
      <p className="text-base font-bold text-slate-900">No students found</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        {hasFilters
          ? 'Try changing search or filter options.'
          : restricted
            ? 'No student record is linked to your account.'
            : 'Add your first student or import from the Google Form CSV.'}
      </p>
      {hasFilters && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onClearFilters}>
          Clear filters
        </Button>
      )}
      {canManage && !hasFilters && !restricted && (
        <Button asChild className="mt-4 bg-blue-700 hover:bg-blue-800">
          <Link href="/dashboard/students/new">
            <Plus className="mr-1.5 h-4 w-4" /> Add student
          </Link>
        </Button>
      )}
    </div>
  );
}

const StudentListRow = memo(function StudentListRow({
  student: s,
  index,
  canManage,
  canViewExamAnalysis,
  deletingId,
  onDelete,
  compact,
}: {
  student: Student;
  index: number;
  canManage: boolean;
  canViewExamAnalysis: boolean;
  deletingId: string | null;
  onDelete: (id: string) => void;
  compact?: boolean;
}) {
  const contact = s.phone || s.parentPhone;
  const email = s.email || s.parentEmail;

  return (
    <li className="group">
      <div className="flex items-center gap-2 px-3 py-2.5 transition-colors hover:bg-slate-50/80 sm:gap-3 sm:px-4 sm:py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
          <Link href={`/dashboard/students/${s.id}`} className="shrink-0">
            <StudentProfilePhoto
              name={s.name}
              profileImageUrl={s.profileImageUrl}
              size="md"
              className="h-10 w-10 rounded-xl sm:h-11 sm:w-11"
            />
          </Link>
          <div className="min-w-0 flex-1">
            <Link href={`/dashboard/students/${s.id}`} className="block min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-bold text-slate-900 group-hover:text-blue-800">
                  {s.name}
                </p>
                <Badge variant={statusVariants[s.status]} className="shrink-0 capitalize text-[10px]">
                  {s.status}
                </Badge>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[10px] text-slate-500 sm:text-[11px]">
                <span className="font-mono font-semibold text-slate-700">{s.admissionNumber}</span>
                <span className="text-slate-300 max-sm:hidden">·</span>
                <span className="truncate">
                  {s.grade}
                  {s.section ? ` · ${s.section}` : ''}
                </span>
              </div>
              {!compact && (
                <p className="mt-0.5 hidden truncate text-[11px] font-medium text-blue-700 sm:block">
                  {s.nameWithInitials || '—'}
                </p>
              )}
            </Link>
            {!compact && (contact || email) && (
              <div className="mt-1 hidden flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500 md:flex">
                {contact && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3 w-3 shrink-0" />
                    <ContactActionLink kind="tel" value={contact} className="text-[11px]" />
                  </span>
                )}
                {email && (
                  <span className="inline-flex max-w-[220px] items-center gap-1 truncate">
                    <Mail className="h-3 w-3 shrink-0" />
                    <ContactActionLink kind="mailto" value={email} className="truncate text-[11px]" />
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          <div className="hidden items-center gap-0.5 lg:flex">
            <Button variant="ghost" size="icon" className="h-9 w-9" asChild title="View profile">
              <Link href={`/dashboard/students/${s.id}`}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
            {canViewExamAnalysis && (
              <Button
                variant="ghost"
                size="icon"
                className="inline-flex h-9 w-9 shrink-0 text-violet-600 hover:bg-violet-50 hover:text-violet-800"
                asChild
                title="Exam Performance Analysis"
                aria-label="Exam Performance Analysis"
              >
                <Link href={`/dashboard/students/${s.id}/exam-performance`}>
                  <BarChart3 className="h-4 w-4" />
                </Link>
              </Button>
            )}
            {canManage && (
              <>
                <Button variant="ghost" size="icon" className="h-9 w-9" asChild title="Edit">
                  <Link href={`/dashboard/students/${s.id}/edit`}>
                    <Pencil className="h-4 w-4" />
                  </Link>
                </Button>
                <DeleteButton
                  student={s}
                  deleting={deletingId === s.id}
                  onDelete={() => onDelete(s.id)}
                />
              </>
            )}
          </div>
          <MobileRowActions
            actions={[
              { label: 'View profile', icon: <Eye className="h-4 w-4" />, href: `/dashboard/students/${s.id}` },
              {
                label: 'Exam analysis',
                icon: <BarChart3 className="h-4 w-4" />,
                href: `/dashboard/students/${s.id}/exam-performance`,
                hidden: !canViewExamAnalysis,
              },
              {
                label: 'Edit',
                icon: <Pencil className="h-4 w-4" />,
                href: `/dashboard/students/${s.id}/edit`,
                hidden: !canManage,
              },
            ]}
          />
          {canManage && (
            <div className="lg:hidden">
              <DeleteButton
                student={s}
                deleting={deletingId === s.id}
                onDelete={() => onDelete(s.id)}
              />
            </div>
          )}
        </div>
      </div>
    </li>
  );
});

function StudentGridCard({
  student: s,
  index,
  canManage,
  canViewExamAnalysis,
  deletingId,
  onDelete,
}: {
  student: Student;
  index: number;
  canManage: boolean;
  canViewExamAnalysis: boolean;
  deletingId: string | null;
  onDelete: (id: string) => void;
}) {
  return (
    <motion.div
      layout
      initial={false}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ delay: Math.min(index * 0.03, 0.35), duration: 0.25 }}
    >
      <div className="flex h-full flex-col rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm transition-shadow hover:shadow-md hover:border-blue-200/60">
        <Link href={`/dashboard/students/${s.id}`} className="flex flex-1 flex-col items-center text-center">
          <StudentProfilePhoto
            name={s.name}
            profileImageUrl={s.profileImageUrl}
            size="md"
            className="h-16 w-16 rounded-xl"
          />
          <p className="mt-2 line-clamp-2 text-sm font-bold text-slate-900">{s.name}</p>
          <p className="mt-0.5 font-mono text-[11px] font-semibold text-blue-700">{s.admissionNumber}</p>
          <p className="mt-1 text-[11px] text-slate-500">
            {s.grade}
            {s.section ? ` · ${s.section}` : ''}
          </p>
          <Badge
            variant={statusVariants[s.status]}
            className="mt-2 capitalize text-[10px]"
          >
            {s.status}
          </Badge>
        </Link>
        <div className="mt-3 flex justify-center gap-1 border-t border-slate-100 pt-2">
          <Button variant="ghost" size="icon" className="touch-target-icon h-11 w-11 sm:h-9 sm:w-9" asChild title="View profile">
            <Link href={`/dashboard/students/${s.id}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
          {canViewExamAnalysis && (
            <Button
              variant="ghost"
              size="icon"
              className="touch-target-icon h-11 w-11 text-violet-600 hover:bg-violet-50 hover:text-violet-800 sm:h-9 sm:w-9"
              asChild
              title="Exam Performance Analysis"
              aria-label="Exam Performance Analysis"
            >
              <Link href={`/dashboard/students/${s.id}/exam-performance`}>
                <BarChart3 className="h-4 w-4" />
              </Link>
            </Button>
          )}
          {canManage && (
            <>
              <Button variant="ghost" size="icon" className="touch-target-icon h-11 w-11 sm:h-9 sm:w-9" asChild>
                <Link href={`/dashboard/students/${s.id}/edit`}>
                  <Pencil className="h-4 w-4" />
                </Link>
              </Button>
              <DeleteButton
                student={s}
                deleting={deletingId === s.id}
                onDelete={() => onDelete(s.id)}
              />
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function DeleteButton({
  student,
  deleting,
  onDelete,
}: {
  student: Student;
  deleting: boolean;
  onDelete: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="touch-target-icon h-11 w-11 text-rose-500 hover:bg-rose-50 hover:text-rose-700 sm:h-9 sm:w-9"
          disabled={deleting}
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete student</AlertDialogTitle>
          <AlertDialogDescription>
            Permanently delete <strong>{student.name}</strong> ({student.admissionNumber})? This
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onDelete}
            className="bg-rose-600 hover:bg-rose-700"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
