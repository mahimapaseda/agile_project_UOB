'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  Calendar,
  ChevronRight,
  Download,
} from 'lucide-react';
import { DirectorySkeleton } from '@/components/ui/DirectorySkeleton';
import { MobileRowActions } from '@/components/layout/MobileRowActions';
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
import { EXAM_GRADES } from '@/lib/exam-subjects';
import { formatClassSection } from '@/lib/grade-class-options';
import { countFilledPeriods } from '@/lib/timetable-utils';
import { exportTimetablePdf } from '@/lib/timetable-pdf-export';
import type { ClassTimetable } from '@/types';

const FILTER_ALL = 'all';

interface TimetablesDirectoryProps {
  timetables: ClassTimetable[];
  loading: boolean;
  canManage: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  gradeFilter: string;
  onGradeFilterChange: (value: string) => void;
  yearFilter: string;
  onYearFilterChange: (value: string) => void;
  onDelete: (id: string) => Promise<void>;
}

export function TimetablesDirectory({
  timetables,
  loading,
  canManage,
  search,
  onSearchChange,
  gradeFilter,
  onGradeFilterChange,
  yearFilter,
  onYearFilterChange,
  onDelete,
}: TimetablesDirectoryProps) {
  const yearOptions = Array.from(
    new Set(timetables.map((t) => t.academicYear)),
  ).sort((a, b) => b - a);
  const currentYear = new Date().getFullYear();
  if (!yearOptions.includes(currentYear)) yearOptions.unshift(currentYear);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Class timetables</h2>
          <p className="text-xs text-slate-500">Weekly schedules by grade and class</p>
        </div>
        {canManage ? (
          <Button asChild size="sm" className="min-h-9 shrink-0">
            <Link href="/dashboard/timetable/new">
              <Plus className="mr-1.5 h-4 w-4" />
              New timetable
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="shrink-0 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm sm:p-4">
        <div className="directory-toolbar">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search timetables…"
              className="h-11 border-slate-200 bg-slate-50/50 pl-9 text-base sm:h-10 sm:text-sm"
            />
          </div>
          <div className="directory-toolbar-actions">
          <Select value={gradeFilter} onValueChange={onGradeFilterChange}>
            <SelectTrigger className="h-11 w-full sm:h-10 sm:w-[140px]">
              <SelectValue placeholder="Grade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_ALL}>All grades</SelectItem>
              {EXAM_GRADES.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={yearFilter} onValueChange={onYearFilterChange}>
            <SelectTrigger className="h-11 w-full sm:h-10 sm:w-[120px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_ALL}>All years</SelectItem>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          </div>
        </div>
      </div>

      {loading ? (
        <DirectorySkeleton label="Loading timetables…" />
      ) : timetables.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50">
            <Calendar className="h-7 w-7 text-violet-400" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No timetables yet</h3>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            {canManage
              ? 'Create a class timetable to share weekly schedules with staff, students, and parents.'
              : 'Your class timetable will appear here when published by the school.'}
          </p>
          {canManage ? (
            <Button asChild className="mt-4">
              <Link href="/dashboard/timetable/new">
                <Plus className="mr-2 h-4 w-4" />
                Create timetable
              </Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-2">
          {timetables.map((timetable, index) => {
            const filled = countFilledPeriods(timetable);
            const classLabel = formatClassSection(timetable.grade, timetable.section);

            return (
              <motion.div
                key={timetable.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <div className="group rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition-shadow hover:shadow-md sm:p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/dashboard/timetable/${timetable.id}`}
                          className="truncate text-sm font-bold text-slate-900 hover:text-violet-700 sm:text-base"
                        >
                          {timetable.title}
                        </Link>
                        <Badge variant="secondary" className="text-[10px]">
                          {timetable.term}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {timetable.grade} · {classLabel} · {timetable.academicYear}
                      </p>
                      <p className="mt-1 text-[11px] font-medium text-slate-400">
                        {filled} period{filled !== 1 ? 's' : ''} scheduled
                      </p>
                    </div>
                    <div className="hidden shrink-0 items-center gap-1 sm:flex">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => void exportTimetablePdf(timetable)}
                        title="Download PDF"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button asChild variant="ghost" size="icon" className="h-9 w-9">
                        <Link href={`/dashboard/timetable/${timetable.id}`} title="View">
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      {canManage ? (
                        <>
                          <Button asChild variant="ghost" size="icon" className="h-9 w-9">
                            <Link href={`/dashboard/timetable/${timetable.id}/edit`} title="Edit">
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 text-red-600 hover:bg-red-50 hover:text-red-700"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete timetable?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently remove the timetable for {timetable.title}.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-red-600 hover:bg-red-700"
                                  onClick={() => void onDelete(timetable.id)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      ) : null}
                      <ChevronRight className="h-4 w-4 text-slate-300" />
                    </div>
                  </div>
                  <MobileRowActions
                    className="mt-3 sm:hidden"
                    actions={[
                      {
                        label: 'View',
                        href: `/dashboard/timetable/${timetable.id}`,
                        icon: <Eye className="h-4 w-4" />,
                      },
                      {
                        label: 'PDF',
                        onClick: () => void exportTimetablePdf(timetable),
                        icon: <Download className="h-4 w-4" />,
                      },
                      ...(canManage
                        ? [
                            {
                              label: 'Edit',
                              href: `/dashboard/timetable/${timetable.id}/edit`,
                              icon: <Pencil className="h-4 w-4" />,
                            },
                            {
                              label: 'Delete',
                              onClick: () => void onDelete(timetable.id),
                              icon: <Trash2 className="h-4 w-4" />,
                              destructive: true,
                            },
                          ]
                        : []),
                    ]}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
