'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ResponsiveTable } from '@/components/layout/ResponsiveTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExamResult, Examination, Staff } from '@/types';
import {
  buildGradeSubjectDetail,
  formatPct,
  SCORE_BANDS,
  type GradeSubjectAnalysisRow,
} from '@/lib/examination-information';
import { cn } from '@/lib/utils';
import { ContactActionLink } from '@/components/contact/ContactActionLink';
import { GraduationCap, Mail, Phone, ExternalLink } from 'lucide-react';

interface GradeSubjectDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: GradeSubjectAnalysisRow | null;
  results: ExamResult[];
  staff: Staff[];
  exam: Examination | null;
}

const BAND_COLORS: Record<string, string> = {
  '0-19': 'border-rose-200 bg-rose-50 text-rose-800',
  '20-39': 'border-orange-200 bg-orange-50 text-orange-800',
  '40-54': 'border-amber-200 bg-amber-50 text-amber-800',
  '55-64': 'border-sky-200 bg-sky-50 text-sky-800',
  '65-74': 'border-blue-200 bg-blue-50 text-blue-800',
  '75-100': 'border-emerald-200 bg-emerald-50 text-emerald-800',
};

function MiniStat({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  tone?: 'default' | 'success' | 'danger' | 'warning' | 'muted';
}) {
  const tones = {
    default: 'border-slate-200 bg-slate-50 text-slate-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    danger: 'border-rose-200 bg-rose-50 text-rose-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    muted: 'border-slate-200 bg-white text-slate-700',
  };
  return (
    <div className={cn('rounded-xl border px-3 py-2', tones[tone])}>
      <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-0.5 text-base font-bold tabular-nums">{value}</p>
    </div>
  );
}

export function GradeSubjectDetailDialog({
  open,
  onOpenChange,
  row,
  results,
  staff,
  exam,
}: GradeSubjectDetailDialogProps) {
  const detail = useMemo(
    () => (row ? buildGradeSubjectDetail(results, staff, row) : null),
    [row, results, staff],
  );

  if (!row || !detail) return null;

  const initials = detail.teacherName
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const lowestTone =
    detail.lowestPct >= 40 ? 'success' : detail.lowestPct >= 25 ? 'warning' : 'danger';
  const highestTone = detail.highestPct >= 40 ? 'success' : 'danger';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,900px)] w-[calc(100vw-1.5rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:w-full">
        <div className="shrink-0 border-b border-violet-100 bg-violet-50 px-5 pb-4 pt-5 sm:px-6">
          <DialogHeader className="space-y-3 p-0 pr-10 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-violet-300 bg-violet-100 text-violet-900 hover:bg-violet-100">
                {detail.subject}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {detail.grade}
              </Badge>
              {exam && (
                <span className="text-xs text-slate-500">
                  {exam.year} · {exam.term} · {exam.examName}
                </span>
              )}
            </div>
            <DialogTitle className="text-xl font-extrabold leading-snug text-slate-900">
              Grade mark-band summary
            </DialogTitle>
            <DialogDescription asChild>
              <div className="flex items-start gap-3 pt-1">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-sm font-extrabold text-indigo-800 ring-2 ring-violet-100">
                  {initials || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold text-slate-900">{detail.teacherName}</p>
                  <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-600">
                    <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                    <span>
                      Assigned grades (staff profile):{' '}
                      <span className="font-medium text-slate-800">{detail.teachingGrades}</span>
                    </span>
                  </p>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MiniStat label="In class" value={detail.studentsInClass} />
            <MiniStat label="Appeared" value={detail.appeared} tone="default" />
            <MiniStat
              label="Not appeared"
              value={detail.notAppeared}
              tone={detail.notAppeared > 0 ? 'warning' : 'muted'}
            />
            <MiniStat label="Pass rate ≥35%" value={formatPct(detail.above40Pct)} tone="success" />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MiniStat
              label="Below 40"
              value={`${detail.below40} (${formatPct(detail.below40Pct)})`}
              tone={detail.below40 > 0 ? 'danger' : 'muted'}
            />
            <MiniStat
              label="Above 40"
              value={`${detail.above40} (${formatPct(detail.above40Pct)})`}
              tone="success"
            />
            <MiniStat label="Average %" value={formatPct(detail.averagePct)} tone="warning" />
            <MiniStat
              label="High / Low"
              value={`${formatPct(detail.highestPct)} / ${formatPct(detail.lowestPct)}`}
            />
          </div>

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Mark bands (% of subject marks)
            </p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {SCORE_BANDS.map((band) => (
                <div
                  key={band}
                  className={cn(
                    'flex flex-col items-center rounded-lg border px-2 py-2',
                    detail.bands[band] > 0
                      ? BAND_COLORS[band]
                      : 'border-slate-200 bg-white text-slate-400',
                  )}
                >
                  <span className="text-[10px] font-semibold opacity-80">{band}</span>
                  <span className="text-lg font-bold tabular-nums">{detail.bands[band]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Score range
            </p>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-slate-500">Average</span>
                <p className="font-bold tabular-nums text-amber-700">{formatPct(detail.averagePct)}</p>
              </div>
              <div>
                <span className="text-slate-500">Highest</span>
                <p
                  className={cn(
                    'font-bold tabular-nums',
                    highestTone === 'success' ? 'text-emerald-700' : 'text-rose-700',
                  )}
                >
                  {formatPct(detail.highestPct)}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Lowest</span>
                <p
                  className={cn(
                    'font-bold tabular-nums',
                    lowestTone === 'success'
                      ? 'text-emerald-700'
                      : lowestTone === 'warning'
                        ? 'text-amber-700'
                        : 'text-rose-700',
                  )}
                >
                  {formatPct(detail.lowestPct)}
                </p>
              </div>
            </div>
          </div>

          {detail.teacher && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Teacher contact
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-700">
                {detail.teacher.phone && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <ContactActionLink kind="tel" value={detail.teacher.phone} className="text-sm" />
                  </span>
                )}
                {detail.teacher.email && (
                  <span className="inline-flex items-center gap-1.5 break-all">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <ContactActionLink kind="mailto" value={detail.teacher.email} className="text-sm" />
                  </span>
                )}
                {detail.teacher.appointedSubject && (
                  <span className="text-slate-500">
                    Appointed: {detail.teacher.appointedSubject}
                  </span>
                )}
              </div>
              {detail.teacher.id && (
                <Button variant="link" size="sm" className="mt-2 h-auto p-0 text-violet-700" asChild>
                  <Link href={`/dashboard/staff/${detail.teacher.id}`}>
                    View staff profile <ExternalLink className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              )}
            </div>
          )}

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Student results ({detail.students.length})
            </p>
            {detail.students.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                No students appeared for this subject in {detail.grade}.
              </p>
            ) : (
              <>
              <ul className="space-y-2 lg:hidden">
                {detail.students.map((s) => (
                  <li
                    key={s.admissionNumber}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{s.studentName}</p>
                      <p className="font-mono text-[10px] text-slate-400">{s.admissionNumber}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs tabular-nums text-slate-600">
                        {s.obtainedMarks}/{s.maxMarks}
                      </p>
                      <p className={cn('text-sm font-bold tabular-nums', s.passed ? 'text-emerald-700' : 'text-rose-700')}>
                        {formatPct(s.percentage)}
                      </p>
                      <Badge variant="outline" className="mt-0.5 font-mono text-[10px]">
                        {s.band}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
              <ResponsiveTable className="hidden rounded-xl border border-slate-200 lg:block">
                <table className="w-full min-w-[480px] border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="border-b border-slate-200 px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        Student
                      </th>
                      <th className="border-b border-slate-200 px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        Marks
                      </th>
                      <th className="border-b border-slate-200 px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        %
                      </th>
                      <th className="border-b border-slate-200 px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        Band
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.students.map((s) => (
                      <tr key={s.admissionNumber} className="bg-white">
                        <td className="border-b border-slate-100 px-3 py-2.5 last:border-b-0">
                          <p className="font-medium text-slate-900">{s.studentName}</p>
                          <p className="font-mono text-[10px] text-slate-400">{s.admissionNumber}</p>
                        </td>
                        <td className="border-b border-slate-100 px-3 py-2.5 text-right tabular-nums text-slate-700 last:border-b-0">
                          {s.obtainedMarks}/{s.maxMarks}
                        </td>
                        <td
                          className={cn(
                            'border-b border-slate-100 px-3 py-2.5 text-right tabular-nums font-bold last:border-b-0',
                            s.passed ? 'text-emerald-700' : 'text-rose-700',
                          )}
                        >
                          {formatPct(s.percentage)}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-2.5 text-center last:border-b-0">
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {s.band}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ResponsiveTable>
              </>
            )}
          </div>

          {detail.absentStudents.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                In class but not appeared ({detail.absentStudents.length})
              </p>
              <ul className="space-y-2 lg:hidden">
                {detail.absentStudents.map((s) => (
                  <li
                    key={s.admissionNumber}
                    className="rounded-xl border border-amber-200 bg-amber-50/40 px-3 py-2.5"
                  >
                    <p className="text-sm font-medium text-slate-800">{s.studentName}</p>
                    <p className="font-mono text-[10px] text-amber-700">{s.admissionNumber}</p>
                  </li>
                ))}
              </ul>
              <ResponsiveTable className="hidden rounded-xl border border-amber-200 bg-amber-50/30 lg:block">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-amber-50/80">
                      <th className="border-b border-amber-200 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-amber-800">
                        Student
                      </th>
                      <th className="border-b border-amber-200 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-amber-800">
                        Admission #
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.absentStudents.map((s) => (
                      <tr key={s.admissionNumber} className="bg-white/60">
                        <td className="border-b border-amber-100 px-3 py-2 font-medium text-slate-800 last:border-b-0">
                          {s.studentName}
                        </td>
                        <td className="border-b border-amber-100 px-3 py-2 font-mono text-xs text-slate-500 last:border-b-0">
                          {s.admissionNumber}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ResponsiveTable>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
