'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, BookOpen, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StudentExamAnalysis } from '@/components/students/StudentExamAnalysis';
import { StudentProfilePhoto } from '@/components/students/StudentProfilePhoto';
import { ExamResult, Student } from '@/types';
import { formatClassSection } from '@/lib/grade-class-options';

interface StudentExamPerformanceViewProps {
  student: Student;
  results: ExamResult[];
  backHref: string;
  backLabel?: string;
  profileLinkLabel?: string;
}

export function StudentExamPerformanceView({
  student,
  results,
  backHref,
  backLabel = 'Back',
  profileLinkLabel = 'View full profile',
}: StudentExamPerformanceViewProps) {
  const summary =
    results.length === 0
      ? { exams: 0, average: 0 }
      : {
          exams: results.length,
          average: results.reduce((s, r) => s + r.percentage, 0) / results.length,
        };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 sm:gap-2.5">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <Button variant="ghost" size="sm" asChild className="-ml-2 h-9 px-2 text-sm text-slate-500">
          <Link href={backHref}>
            <ArrowLeft className="mr-1 h-4 w-4 sm:mr-1.5" /> {backLabel}
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild className="h-9 max-w-[60%] text-sm">
          <Link href={`/dashboard/students/${student.id}`}>
            <BookOpen className="mr-1 h-4 w-4 shrink-0 sm:mr-1.5" />
            <span className="truncate">{profileLinkLabel}</span>
            <ArrowUpRight className="ml-0.5 h-3.5 w-3.5 shrink-0" />
          </Link>
        </Button>
      </div>

      <div className="surface-violet flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 shadow-md sm:gap-3 sm:px-4 sm:py-3">
        <StudentProfilePhoto
          name={student.name}
          profileImageUrl={student.profileImageUrl}
          size="md"
          className="h-10 w-10 shrink-0 rounded-lg ring-2 ring-white/20 sm:h-12 sm:w-12"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold leading-tight sm:text-lg">{student.name}</p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-indigo-100 sm:text-sm">
            <span className="inline-flex items-center gap-0.5 font-mono text-amber-200">
              <Hash className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              {student.admissionNumber}
            </span>
            <span>{student.grade}</span>
            {student.section && (
              <span>{formatClassSection(student.grade, student.section)}</span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 gap-1.5 text-center sm:gap-2">
          <div className="rounded-lg bg-white/10 px-2.5 py-1 ring-1 ring-white/15 sm:px-3 sm:py-1.5">
            <p className="text-base font-extrabold leading-none sm:text-lg">
              {summary.exams ? `${summary.average.toFixed(0)}%` : '—'}
            </p>
            <p className="text-[10px] uppercase tracking-wide text-indigo-200 sm:text-[11px]">Avg</p>
          </div>
          <div className="rounded-lg bg-white/10 px-2.5 py-1 ring-1 ring-white/15 sm:px-3 sm:py-1.5">
            <p className="text-base font-extrabold leading-none sm:text-lg">{summary.exams}</p>
            <p className="text-[10px] uppercase tracking-wide text-indigo-200 sm:text-[11px]">Exams</p>
          </div>
        </div>
      </div>

      <StudentExamAnalysis results={results} className="min-h-0 flex-1" />
    </div>
  );
}
