'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { useWindowedList } from '@/lib/hooks/use-windowed-list';
import { LoadMoreBar } from '@/components/ui/LoadMoreBar';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Download,
  Upload,
  Eye,
  Pencil,
  Trash2,
  UserX,
  Users,
  UserCheck,
  Briefcase,
  GraduationCap,
  LayoutGrid,
  List,
  Phone,
  Mail,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { DirectoryPanelHeader } from '@/components/layout/DirectoryPanelHeader';
import { MobileRowActions } from '@/components/layout/MobileRowActions';
import { StaffAvatar } from '@/components/staff/StaffAvatar';
import { ContactActionLink } from '@/components/contact/ContactActionLink';
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
import { RecordExportDialog } from '@/components/export/RecordExportDialog';

const StaffCsvImportDialog = dynamic(
  () =>
    import('@/components/staff/StaffCsvImportDialog').then((m) => ({
      default: m.StaffCsvImportDialog,
    })),
  { ssr: false },
);
import {
  STAFF_EXPORT_FIELDS_FULL,
  STAFF_EXPORT_FIELDS_LIMITED,
  STAFF_PDF_EXCLUDED_FIELD_KEYS,
  STAFF_PDF_FIELD_ORDER,
} from '@/lib/record-export-fields';
import { Staff } from '@/types';
import { cn } from '@/lib/utils';
import { StatIconBadge } from '@/components/ui/StatIconBadge';
import { DirectorySkeleton } from '@/components/ui/DirectorySkeleton';

type StatusVariant = 'success' | 'secondary' | 'warning';
type ViewMode = 'list' | 'grid';

const FILTER_ALL = 'all';

const statusVariants: Record<Staff['status'], StatusVariant> = {
  active: 'success',
  inactive: 'secondary',
  retired: 'warning',
};

const TYPE_OPTIONS = [
  { value: FILTER_ALL, label: 'All types' },
  { value: 'academic', label: 'Academic' },
  { value: 'non-academic', label: 'Non-academic' },
] as const;

const STATUS_OPTIONS = [
  { value: FILTER_ALL, label: 'All status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'retired', label: 'Retired' },
] as const;

const STAFF_STATUS_OPTIONS: { value: Staff['status']; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'retired', label: 'Retired' },
];

interface StaffDirectoryProps {
  staff: Staff[];
  loading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  canManage: boolean;
  /** Teachers — contact fields only in list/grid/detail. */
  limitedView?: boolean;
  onStatusChange?: (id: string, status: Staff['status']) => void | Promise<void>;
  onDelete: (id: string) => void;
  csvImportOpen: boolean;
  onCsvImportOpenChange: (open: boolean) => void;
  onImported: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function StaffDirectory({
  staff,
  loading,
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  canManage,
  limitedView = false,
  onStatusChange,
  onDelete,
  csvImportOpen,
  onCsvImportOpenChange,
  onImported,
  viewMode,
  onViewModeChange,
}: StaffDirectoryProps) {
  const [exportOpen, setExportOpen] = useState(false);
  const { visible: visibleStaff, hasMore, loadMore, total, visibleCount } = useWindowedList(staff);
  const exportFields = limitedView ? STAFF_EXPORT_FIELDS_LIMITED : STAFF_EXPORT_FIELDS_FULL;

  const stats = useMemo(() => {
    const active = staff.filter((s) => s.status === 'active').length;
    const academic = staff.filter((s) => s.staffType === 'academic').length;
    const nonAcademic = staff.filter((s) => s.staffType === 'non-academic').length;
    const retired = staff.filter((s) => s.status === 'retired').length;
    return { total: staff.length, active, academic, nonAcademic, retired };
  }, [staff]);

  const hasFilters =
    search.trim() !== '' || typeFilter !== FILTER_ALL || statusFilter !== FILTER_ALL;

  const clearFilters = () => {
    onSearchChange('');
    onTypeFilterChange(FILTER_ALL);
    onStatusFilterChange(FILTER_ALL);
  };

  return (
    <div className="directory-root">
      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'directory-stats-strip shrink-0',
          limitedView && 'sm:grid sm:grid-cols-2 sm:gap-2 lg:grid-cols-2',
        )}
      >
        <StatCard
          label={limitedView ? 'Total contacts' : 'Total staff'}
          value={stats.total}
          icon={Users}
          accent="from-emerald-600 to-emerald-800"
        />
        <StatCard label="Active" value={stats.active} icon={UserCheck} accent="from-green-500 to-green-700" />
        {!limitedView && (
          <>
            <StatCard label="Academic" value={stats.academic} icon={GraduationCap} accent="from-blue-500 to-blue-700" />
            <StatCard
              label="Non-academic"
              value={stats.nonAcademic}
              icon={Briefcase}
              accent="from-violet-500 to-violet-700"
              sub={stats.retired ? `${stats.retired} retired` : undefined}
            />
          </>
        )}
      </motion.div>

      <div className="shrink-0 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm ring-1 ring-black/[0.02] sm:p-4">
        <div className="directory-toolbar">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder={
                limitedView
                  ? 'Search name, class, phone, email...'
                  : 'Search name, staff ID, designation, email...'
              }
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-11 border-slate-200 bg-slate-50/50 pl-9 text-base sm:h-10 sm:text-sm focus-visible:ring-emerald-500/30"
            />
          </div>

          <div className="directory-toolbar-actions">
            <div className="flex w-full rounded-lg border border-slate-200 bg-slate-50 p-0.5 sm:w-auto">
              <button
                type="button"
                onClick={() => onViewModeChange('list')}
                className={cn(
                  'touch-target-pill flex flex-1 items-center justify-center gap-1 rounded-md px-3 text-xs font-semibold transition-colors sm:flex-none',
                  viewMode === 'list' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
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
                  viewMode === 'grid' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
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
                  <span className="hidden xs:inline">Import</span>
                </Button>
                <Button
                  size="sm"
                  className="min-h-[44px] gap-1.5 bg-emerald-700 hover:bg-emerald-800 sm:min-h-10"
                  asChild
                >
                  <Link href="/dashboard/staff/new">
                    <Plus className="h-4 w-4" />
                    <span className="hidden xs:inline">Add staff</span>
                    <span className="xs:hidden">Add</span>
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>

        {!limitedView && (
          <>
            <details className="group mt-2.5 lg:hidden">
              <summary className="cursor-pointer list-none text-xs font-bold uppercase tracking-wide text-slate-500 [&::-webkit-details-marker]:hidden">
                <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5">
                  Filters
                  {hasFilters && (
                    <span className="rounded-full bg-emerald-600 px-1.5 py-px text-[9px] font-bold text-white">
                      on
                    </span>
                  )}
                </span>
              </summary>
              <div className="mt-2 space-y-2 border-t border-slate-100 pt-2">
                <div className="flex items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:thin]">
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Type
                  </span>
                  {TYPE_OPTIONS.map((opt) => (
                    <FilterPill
                      key={opt.value}
                      active={typeFilter === opt.value}
                      onClick={() => onTypeFilterChange(opt.value)}
                    >
                      {opt.label}
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
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline-offset-2 hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </details>

            <div className="mt-3 hidden lg:block">
              <div className="flex flex-wrap items-center gap-2">
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Type
                </span>
                {TYPE_OPTIONS.map((opt) => (
                  <FilterPill
                    key={opt.value}
                    active={typeFilter === opt.value}
                    onClick={() => onTypeFilterChange(opt.value)}
                  >
                    {opt.label}
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
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline-offset-2 hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>
          </>
        )}
        {limitedView && hasFilters && (
          <div className="mt-2">
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline-offset-2 hover:underline"
            >
              Clear search
            </button>
          </div>
        )}
      </div>

      <div className="directory-panel ring-1 ring-black/[0.02]">
        <DirectoryPanelHeader
          title={limitedView ? 'Staff contacts' : 'Staff directory'}
          count={staff.length}
          loading={loading}
        />

        <div className="directory-panel-scroll">
          {loading ? (
            <DirectorySkeleton label="Loading staff…" />
          ) : staff.length === 0 ? (
            <EmptyState hasFilters={hasFilters} canManage={canManage} onClearFilters={clearFilters} />
          ) : viewMode === 'grid' ? (
            <>
              <div className="grid grid-cols-2 gap-2 p-2 xs:gap-3 xs:p-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                <AnimatePresence mode="popLayout">
                  {visibleStaff.map((s, i) => (
                    <StaffGridCard
                      key={s.id}
                      member={s}
                      index={i}
                      canManage={canManage}
                      limitedView={limitedView}
                      canChangeStatus={canManage}
                      onStatusChange={onStatusChange}
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
                  {visibleStaff.map((s, i) => (
                    <StaffListRow
                      key={s.id}
                      member={s}
                      index={i}
                      canManage={canManage}
                      limitedView={limitedView}
                      canChangeStatus={canManage}
                      onStatusChange={onStatusChange}
                      onDelete={onDelete}
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
        <StaffCsvImportDialog
          open={csvImportOpen}
          onClose={() => onCsvImportOpenChange(false)}
          onImported={onImported}
        />
      )}

      <RecordExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        title={limitedView ? 'Staff contacts' : 'Staff'}
        records={staff}
        fields={exportFields}
        defaultFormat={limitedView ? 'pdf' : 'csv'}
        defaultFieldKeys={limitedView ? undefined : [...STAFF_PDF_FIELD_ORDER]}
        pdfExcludedFieldKeys={limitedView ? undefined : STAFF_PDF_EXCLUDED_FIELD_KEYS}
        csvExportsAllFields={!limitedView}
        pdfExportsFixedColumns={!limitedView}
        filePrefix={limitedView ? 'staff-contacts' : 'staff-directory'}
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
        {sub && <p className="truncate text-[10px] text-slate-400">{sub}</p>}
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
          ? 'bg-emerald-700 text-white shadow-sm shadow-emerald-900/20'
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
  onClearFilters,
}: {
  hasFilters: boolean;
  canManage: boolean;
  onClearFilters: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
        <UserX className="h-7 w-7 text-slate-400" />
      </div>
      <p className="text-base font-bold text-slate-900">No staff found</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        {hasFilters
          ? 'Try changing search or filter options.'
          : 'Add your first staff member to build the directory.'}
      </p>
      {hasFilters && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onClearFilters}>
          Clear filters
        </Button>
      )}
      {canManage && !hasFilters && (
        <Button asChild className="mt-4 bg-emerald-700 hover:bg-emerald-800">
          <Link href="/dashboard/staff/new">
            <Plus className="mr-1.5 h-4 w-4" /> Add staff
          </Link>
        </Button>
      )}
    </div>
  );
}

function StaffStatusControl({
  member,
  canChangeStatus,
  onStatusChange,
  className,
}: {
  member: Staff;
  canChangeStatus: boolean;
  onStatusChange?: (id: string, status: Staff['status']) => void | Promise<void>;
  className?: string;
}) {
  const [saving, setSaving] = useState(false);

  if (!canChangeStatus || !onStatusChange) {
    return (
      <Badge
        variant={statusVariants[member.status]}
        className={cn('shrink-0 capitalize text-[10px]', className)}
      >
        {member.status}
      </Badge>
    );
  }

  return (
    <div
      className={cn('shrink-0', className)}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Select
        value={member.status}
        disabled={saving}
        onValueChange={async (value) => {
          const next = value as Staff['status'];
          if (next === member.status) return;
          setSaving(true);
          try {
            await onStatusChange(member.id, next);
          } finally {
            setSaving(false);
          }
        }}
      >
        <SelectTrigger
          className={cn(
            'h-7 w-[7.25rem] gap-1 border-slate-200 bg-white px-2 text-[11px] font-semibold capitalize shadow-sm',
            member.status === 'active' && 'border-green-200 text-green-800',
            member.status === 'inactive' && 'text-slate-600',
            member.status === 'retired' && 'border-amber-200 text-amber-800'
          )}
          aria-label={`Status for ${member.name}`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STAFF_STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-sm capitalize">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function StaffListRow({
  member: s,
  index,
  canManage,
  limitedView,
  canChangeStatus,
  onStatusChange,
  onDelete,
}: {
  member: Staff;
  index: number;
  canManage: boolean;
  limitedView?: boolean;
  canChangeStatus: boolean;
  onStatusChange?: (id: string, status: Staff['status']) => void | Promise<void>;
  onDelete: (id: string) => void;
}) {
  const subjectsPreview =
    !limitedView && s.subjects && s.subjects.length > 0
      ? s.subjects.slice(0, 2).join(', ') + (s.subjects.length > 2 ? ` +${s.subjects.length - 2}` : '')
      : null;

  return (
    <motion.li
      layout
      initial={false}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      transition={{ delay: Math.min(index * 0.02, 0.3), duration: 0.25 }}
      className="group list-none"
    >
      <div className="flex items-center gap-2 px-3 py-2.5 transition-colors hover:bg-slate-50/80 sm:gap-3 sm:px-4 sm:py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
          <Link href={`/dashboard/staff/${s.id}`} className="shrink-0">
            <StaffAvatar name={s.name} profileImageUrl={s.profileImageUrl} size="md" className="max-sm:h-10 max-sm:w-10" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Link
                href={`/dashboard/staff/${s.id}`}
                className="min-w-0 flex-1 truncate text-sm font-bold text-slate-900 group-hover:text-emerald-800"
              >
                {s.name}
              </Link>
              {!limitedView && (
                <StaffStatusControl
                  member={s}
                  canChangeStatus={canChangeStatus}
                  onStatusChange={onStatusChange}
                  className="shrink-0"
                />
              )}
            </div>
            <Link href={`/dashboard/staff/${s.id}`} className="block min-w-0">
              {!limitedView && (
                <p className="truncate font-mono text-[10px] font-semibold text-emerald-700 sm:text-[11px]">
                  {s.staffId}
                </p>
              )}
              {limitedView ? (
                <div className="hidden sm:block">
                  {s.nameWithInitials?.trim() && (
                    <p className="mt-0.5 text-[11px] text-slate-600">{s.nameWithInitials}</p>
                  )}
                  {s.classAndGrade?.trim() && (
                    <p className="mt-0.5 text-[11px] font-medium text-slate-700">{s.classAndGrade}</p>
                  )}
                </div>
              ) : (
                <div className="mt-0.5 hidden flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500 sm:flex">
                  <span className="font-medium text-slate-700">{s.designation}</span>
                  <Badge
                    variant={s.staffType === 'academic' ? 'default' : 'secondary'}
                    className="text-[10px] py-0"
                  >
                    {s.staffType === 'academic' ? 'Academic' : 'Non-academic'}
                  </Badge>
                </div>
              )}
              {subjectsPreview && (
                <p className="mt-0.5 hidden items-center gap-1 text-[11px] text-slate-500 lg:flex">
                  <BookOpen className="h-3 w-3 shrink-0" />
                  <span className="truncate">{subjectsPreview}</span>
                </p>
              )}
            </Link>
            <div className="hidden flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500 md:flex">
              {s.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3 w-3 shrink-0" />
                  <ContactActionLink kind="tel" value={s.phone} className="text-[11px]" />
                </span>
              )}
              {s.email && (
                <span className="inline-flex max-w-[220px] items-center gap-1 truncate">
                  <Mail className="h-3 w-3 shrink-0" />
                  <ContactActionLink kind="mailto" value={s.email} className="truncate text-[11px]" />
                </span>
              )}
            </div>
          </div>
        </div>

        <div
          className="flex shrink-0 items-center gap-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="hidden items-center gap-0.5 lg:flex">
            <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
              <Link href={`/dashboard/staff/${s.id}`}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
            {canManage && (
              <>
                <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
                  <Link href={`/dashboard/staff/${s.id}/edit`}>
                    <Pencil className="h-4 w-4" />
                  </Link>
                </Button>
                <DeleteButton member={s} onDelete={() => onDelete(s.id)} />
              </>
            )}
          </div>
          <MobileRowActions
            actions={[
              { label: 'View profile', icon: <Eye className="h-4 w-4" />, href: `/dashboard/staff/${s.id}` },
              {
                label: 'Edit',
                icon: <Pencil className="h-4 w-4" />,
                href: `/dashboard/staff/${s.id}/edit`,
                hidden: !canManage,
              },
            ]}
          />
          {canManage && (
            <div className="lg:hidden">
              <DeleteButton member={s} onDelete={() => onDelete(s.id)} />
            </div>
          )}
        </div>
      </div>
    </motion.li>
  );
}

function StaffGridCard({
  member: s,
  index,
  canManage,
  limitedView,
  canChangeStatus,
  onStatusChange,
  onDelete,
}: {
  member: Staff;
  index: number;
  canManage: boolean;
  limitedView?: boolean;
  canChangeStatus: boolean;
  onStatusChange?: (id: string, status: Staff['status']) => void | Promise<void>;
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
      <div className="flex h-full flex-col rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm transition-shadow hover:border-emerald-200/60 hover:shadow-md">
        <Link href={`/dashboard/staff/${s.id}`} className="flex flex-1 flex-col items-center text-center">
          <StaffAvatar name={s.name} profileImageUrl={s.profileImageUrl} size="lg" className="mx-auto" />
          <p className="mt-2 line-clamp-2 text-sm font-bold text-slate-900">{s.name}</p>
          {limitedView ? (
            <>
              {s.nameWithInitials?.trim() && (
                <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-600">{s.nameWithInitials}</p>
              )}
              {s.classAndGrade?.trim() && (
                <p className="mt-1 line-clamp-2 text-[11px] font-medium text-emerald-800">{s.classAndGrade}</p>
              )}
            </>
          ) : (
            <>
              <p className="mt-0.5 font-mono text-[11px] font-semibold text-emerald-700">{s.staffId}</p>
              <p className="mt-1 line-clamp-1 text-[11px] text-slate-600">{s.designation}</p>
              <div className="mt-2 flex flex-wrap justify-center gap-1">
                <Badge
                  variant={s.staffType === 'academic' ? 'default' : 'secondary'}
                  className="text-[10px]"
                >
                  {s.staffType === 'academic' ? 'Academic' : 'Non-academic'}
                </Badge>
              </div>
            </>
          )}
        </Link>
        {limitedView && (
          <>
            {s.phone && (
              <p className="mt-2 text-center text-[11px] text-slate-500">
                <ContactActionLink kind="tel" value={s.phone} className="text-[11px]" />
              </p>
            )}
            {s.email && (
              <p className="mt-0.5 line-clamp-1 text-center text-[10px] text-slate-500">
                <ContactActionLink kind="mailto" value={s.email} className="text-[10px]" />
              </p>
            )}
          </>
        )}
        {!limitedView && (
          <div className="mt-2 flex justify-center" onClick={(e) => e.stopPropagation()}>
            <StaffStatusControl
              member={s}
              canChangeStatus={canChangeStatus}
              onStatusChange={onStatusChange}
            />
          </div>
        )}
        <div className="mt-3 flex justify-center gap-1 border-t border-slate-100 pt-2">
          <Button variant="ghost" size="icon" className="touch-target-icon h-11 w-11 sm:h-9 sm:w-9" asChild>
            <Link href={`/dashboard/staff/${s.id}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
          {canManage && (
            <>
              <Button variant="ghost" size="icon" className="touch-target-icon h-11 w-11 sm:h-9 sm:w-9" asChild>
                <Link href={`/dashboard/staff/${s.id}/edit`}>
                  <Pencil className="h-4 w-4" />
                </Link>
              </Button>
              <DeleteButton member={s} onDelete={() => onDelete(s.id)} />
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function DeleteButton({ member, onDelete }: { member: Staff; onDelete: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="touch-target-icon h-11 w-11 text-rose-500 hover:bg-rose-50 hover:text-rose-700 sm:h-9 sm:w-9"
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete staff member</AlertDialogTitle>
          <AlertDialogDescription>
            Permanently delete <strong>{member.name}</strong> ({member.staffId})? This cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onDelete} className="bg-rose-600 hover:bg-rose-700">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
