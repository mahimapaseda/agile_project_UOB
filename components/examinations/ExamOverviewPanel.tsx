'use client';

import { Users, UserCheck, UserX, TrendingUp, Award, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Student } from '@/types';
import { formatClassSection } from '@/lib/grade-class-options';
import { getLetterGrade } from '@/lib/utils';

interface ExamOverviewPanelProps {
  enrolledCount: number;
  appearedCount: number;
  orphanCount?: number;
  missingStudents: Student[];
  passRate: number | null;
  classAverage: number | null;
  gradeLabel: string;
  examGrade: string;
  examSection?: string;
  canManage: boolean;
  onImport: () => void;
  onAddResult: () => void;
}

function AttendanceBar({ appeared, missing, total }: { appeared: number; missing: number; total: number }) {
  if (total <= 0) return null;
  const appearedPct = (appeared / total) * 100;
  const missingPct = (missing / total) * 100;

  return (
    <div className="space-y-2">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/80">
        {appeared > 0 && (
          <div
            className="bg-blue-500 transition-all"
            style={{ width: `${appearedPct}%` }}
            title={`${appeared} appeared`}
          />
        )}
        {missing > 0 && (
          <div
            className="bg-amber-400 transition-all"
            style={{ width: `${missingPct}%` }}
            title={`${missing} not appeared`}
          />
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          Appeared {appeared} ({Math.round(appearedPct)}%)
        </span>
        {missing > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            Not appeared {missing} ({Math.round(missingPct)}%)
          </span>
        )}
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  sub,
  icon: Icon,
  tone = 'slate',
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  tone?: 'blue' | 'green' | 'purple' | 'amber' | 'slate';
}) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    purple: 'bg-purple-50 text-purple-700 ring-purple-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    slate: 'bg-slate-50 text-slate-700 ring-slate-100',
  };

  return (
    <div className={`rounded-xl px-3 py-2.5 ring-1 ${tones[tone]}`}>
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
        <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{label}</p>
      </div>
      <p className="mt-1 text-xl font-bold leading-none">{value}</p>
      {sub && <p className="mt-1 text-[10px] opacity-70">{sub}</p>}
    </div>
  );
}

export function ExamOverviewPanel({
  enrolledCount,
  appearedCount,
  orphanCount = 0,
  missingStudents,
  passRate,
  classAverage,
  gradeLabel,
  examGrade,
  examSection,
  canManage,
  onImport,
  onAddResult,
}: ExamOverviewPanelProps) {
  const missingCount = missingStudents.length;
  const streamLabel = examSection ? formatClassSection(examGrade, examSection) : examGrade;

  return (
    <Card className="overflow-hidden border-slate-200/80 shadow-sm">
      <CardContent className="p-0">
        <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_240px] xl:grid-cols-[minmax(0,1fr)_260px]">
          {/* Performance — first on phone/tablet, right column on desktop */}
          <div className="order-1 space-y-3 border-b border-slate-100 bg-slate-50/60 p-4 sm:p-5 lg:order-2 lg:border-b-0 lg:border-l lg:border-slate-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Performance</p>
            {appearedCount > 0 ? (
              <div className="grid grid-cols-3 gap-2 lg:grid-cols-1 lg:gap-2">
                <MetricTile
                  label="Pass rate"
                  value={`${passRate ?? 0}%`}
                  icon={TrendingUp}
                  tone="green"
                  sub="Appeared"
                />
                <MetricTile
                  label="Average"
                  value={`${(classAverage ?? 0).toFixed(1)}%`}
                  icon={Award}
                  tone="purple"
                  sub="Class mean"
                />
                <div className="flex flex-col items-center justify-center rounded-xl bg-white px-2 py-2 text-center ring-1 ring-slate-200 lg:px-3 lg:py-3">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500 lg:text-[10px]">Grade</p>
                  <p className="text-2xl font-bold text-amber-600 lg:mt-1 lg:text-3xl">{gradeLabel}</p>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[5rem] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/60 px-4 text-center lg:min-h-[8rem]">
                <p className="text-sm font-medium text-slate-600">No results yet</p>
                <p className="mt-1 text-xs text-slate-400">Import or add results to see stats</p>
              </div>
            )}
          </div>

          {/* Attendance — second on phone/tablet, left column on desktop */}
          <div className="order-2 space-y-4 p-4 sm:p-5 lg:order-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Class attendance</p>
                <p className="mt-0.5 text-sm text-slate-600">
                  {enrolledCount} enrolled in {streamLabel}
                  {orphanCount > 0 ? ` · ${orphanCount} stale result${orphanCount !== 1 ? 's' : ''}` : ''}
                </p>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                {appearedCount}/{enrolledCount} in class
              </Badge>
            </div>

            <AttendanceBar appeared={appearedCount} missing={missingCount} total={enrolledCount} />

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <MetricTile label="Enrolled" value={enrolledCount} icon={Users} tone="slate" />
              <MetricTile label="Appeared" value={appearedCount} icon={UserCheck} tone="blue" />
              <MetricTile
                label="Not appeared"
                value={missingCount}
                icon={UserX}
                tone={missingCount > 0 ? 'amber' : 'slate'}
                sub={missingCount > 0 ? 'No result yet' : 'All accounted for'}
              />
            </div>

            {missingCount > 0 && (
              <div className="rounded-xl border border-amber-200/80 bg-amber-50">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/60 px-3 py-2.5 sm:px-4">
                  <div className="flex items-center gap-2 text-amber-900">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <p className="text-sm font-semibold">
                      {missingCount} student{missingCount !== 1 ? 's' : ''} missing from results
                    </p>
                  </div>
                  {canManage && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="h-7 border-amber-300 bg-white/80 text-xs" onClick={onImport}>
                        Import CSV
                      </Button>
                      <Button size="sm" className="h-7 text-xs" onClick={onAddResult}>
                        Add result
                      </Button>
                    </div>
                  )}
                </div>
                <ul className="divide-y divide-amber-200/50">
                  {missingStudents.map((student) => (
                    <li
                      key={student.id}
                      className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-4"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-amber-950">{student.name}</p>
                        <p className="font-mono text-[11px] text-amber-800/80">{student.admissionNumber}</p>
                      </div>
                      <Badge className="shrink-0 bg-amber-200/80 text-amber-900 hover:bg-amber-200/80">
                        Not appeared
                      </Badge>
                    </li>
                  ))}
                </ul>
                <p className="border-t border-amber-200/60 px-3 py-2 text-[11px] leading-relaxed text-amber-800/90 sm:px-4">
                  Import a row for each student, or add manually. Use <strong>AB</strong> for absent subject marks.
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
