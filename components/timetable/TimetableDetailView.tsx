'use client';

import Link from 'next/link';
import { Pencil, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TimetableGrid } from '@/components/timetable/TimetableGrid';
import { formatClassSection } from '@/lib/grade-class-options';
import { countFilledPeriods } from '@/lib/timetable-utils';
import { exportTimetablePdf } from '@/lib/timetable-pdf-export';
import type { ClassTimetable } from '@/types';

interface TimetableDetailViewProps {
  timetable: ClassTimetable;
  canManage: boolean;
}

export function TimetableDetailView({ timetable, canManage }: TimetableDetailViewProps) {
  const classLabel = formatClassSection(timetable.grade, timetable.section);
  const filled = countFilledPeriods(timetable);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900 sm:text-xl">{timetable.title}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {timetable.grade} · {classLabel} · {timetable.term} {timetable.academicYear}
          </p>
          <p className="mt-2 text-xs font-medium text-slate-400">
            {filled} of 40 weekly periods scheduled
          </p>
          {timetable.notes ? (
            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              {timetable.notes}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void exportTimetablePdf(timetable)}
          >
            <Download className="mr-1.5 h-4 w-4" />
            Download PDF
          </Button>
          {canManage ? (
            <Button asChild size="sm">
              <Link href={`/dashboard/timetable/${timetable.id}/edit`}>
                <Pencil className="mr-1.5 h-4 w-4" />
                Edit
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <TimetableGrid schedule={timetable.schedule} />
    </div>
  );
}
