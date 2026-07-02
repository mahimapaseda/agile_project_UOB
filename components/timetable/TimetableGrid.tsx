'use client';

import { cn } from '@/lib/utils';
import {
  PERIOD_TIME_LABELS,
  TIMETABLE_PERIOD_COUNT,
  WEEKDAYS,
} from '@/lib/timetable-constants';
import type { TimetableDaySchedule } from '@/types';

interface TimetableGridProps {
  schedule: TimetableDaySchedule[];
  editable?: boolean;
  onCellChange?: (
    day: TimetableDaySchedule['day'],
    period: number,
    field: 'subject' | 'teacherName' | 'room',
    value: string,
  ) => void;
  className?: string;
}

export function TimetableGrid({
  schedule,
  editable = false,
  onCellChange,
  className,
}: TimetableGridProps) {
  return (
    <div className={cn('overflow-x-auto rounded-xl border border-slate-200 bg-white', className)}>
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="sticky left-0 z-10 min-w-[88px] border-r border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              Period
            </th>
            {WEEKDAYS.map((day) => (
              <th
                key={day.value}
                className="min-w-[120px] px-2 py-2.5 text-center text-xs font-bold uppercase tracking-wide text-slate-600"
              >
                <span className="hidden sm:inline">{day.label}</span>
                <span className="sm:hidden">{day.short}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: TIMETABLE_PERIOD_COUNT }, (_, i) => i + 1).map((period) => (
            <tr key={period} className="border-b border-slate-100 last:border-b-0">
              <td className="sticky left-0 z-10 border-r border-slate-200 bg-white px-3 py-2 align-top">
                <div className="font-bold text-slate-800">P{period}</div>
                <div className="text-[10px] font-medium leading-tight text-slate-400">
                  {PERIOD_TIME_LABELS[period]}
                </div>
              </td>
              {WEEKDAYS.map((day) => {
                const daySchedule = schedule.find((d) => d.day === day.value);
                const cell = daySchedule?.periods.find((p) => p.period === period);
                const subject = cell?.subject?.trim() ?? '';
                const teacher = cell?.teacherName?.trim() ?? '';
                const room = cell?.room?.trim() ?? '';

                return (
                  <td key={day.value} className="px-1.5 py-1.5 align-top">
                    {editable ? (
                      <div className="space-y-1 rounded-lg border border-slate-200 bg-slate-50/80 p-1.5">
                        <input
                          type="text"
                          value={subject}
                          onChange={(e) =>
                            onCellChange?.(day.value, period, 'subject', e.target.value)
                          }
                          placeholder="Subject"
                          className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-900 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                          list="timetable-subject-suggestions"
                        />
                        <input
                          type="text"
                          value={teacher}
                          onChange={(e) =>
                            onCellChange?.(day.value, period, 'teacherName', e.target.value)
                          }
                          placeholder="Teacher"
                          className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                        />
                        <input
                          type="text"
                          value={room}
                          onChange={(e) =>
                            onCellChange?.(day.value, period, 'room', e.target.value)
                          }
                          placeholder="Room"
                          className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-500 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                        />
                      </div>
                    ) : (
                      <div
                        className={cn(
                          'min-h-[52px] rounded-lg px-2 py-1.5',
                          subject ? 'bg-violet-50/80' : 'bg-slate-50/50',
                        )}
                      >
                        <p
                          className={cn(
                            'text-xs font-semibold leading-snug',
                            subject ? 'text-violet-900' : 'text-slate-300',
                          )}
                        >
                          {subject || '—'}
                        </p>
                        {teacher ? (
                          <p className="mt-0.5 text-[10px] font-medium text-slate-600">{teacher}</p>
                        ) : null}
                        {room ? (
                          <p className="text-[10px] text-slate-400">{room}</p>
                        ) : null}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
