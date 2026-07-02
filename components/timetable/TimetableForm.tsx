'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ClassSectionSelect } from '@/components/examinations/ClassSectionSelect';
import { TimetableGrid } from '@/components/timetable/TimetableGrid';
import { EXAM_GRADES } from '@/lib/exam-subjects';
import {
  getClassOptionsForGrade,
  getDefaultClassSection,
  normalizeClassSection,
} from '@/lib/grade-class-options';
import { TIMETABLE_SUBJECT_OPTIONS } from '@/lib/timetable-constants';
import {
  buildTimetableTitle,
  getTimetableTermOptions,
  normalizeTimetableSchedule,
} from '@/lib/timetable-utils';
import type { ClassTimetable, TimetableDaySchedule } from '@/types';
import { Save } from 'lucide-react';

const schema = z.object({
  grade: z.string().min(1, 'Grade is required'),
  section: z.string().min(1, 'Class is required'),
  academicYear: z.number().int().min(2000).max(2100),
  term: z.string().min(1, 'Term is required'),
  notes: z.string().optional(),
});

export type TimetableFormData = z.infer<typeof schema> & {
  schedule: TimetableDaySchedule[];
};

interface TimetableFormProps {
  initial?: Partial<ClassTimetable>;
  saving?: boolean;
  submitLabel?: string;
  onSubmit: (data: TimetableFormData) => void | Promise<void>;
  onCancel?: () => void;
}

const defaultYear = new Date().getFullYear();
const defaultTerm = 'Term 1';

export function TimetableForm({
  initial,
  saving = false,
  submitLabel = 'Save timetable',
  onSubmit,
  onCancel,
}: TimetableFormProps) {
  const [schedule, setSchedule] = useState<TimetableDaySchedule[]>(() =>
    normalizeTimetableSchedule(initial?.schedule),
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      grade: initial?.grade ?? '',
      section: initial?.section ?? '',
      academicYear: initial?.academicYear ?? defaultYear,
      term: initial?.term ?? defaultTerm,
      notes: initial?.notes ?? '',
    },
  });

  const grade = watch('grade');
  const section = watch('section');
  const academicYear = watch('academicYear');
  const term = watch('term');

  useEffect(() => {
    if (!grade) return;
    const normalized = normalizeClassSection(grade, section);
    const valid = getClassOptionsForGrade(grade).some((o) => o.value === normalized);
    if (!valid) {
      setValue('section', getDefaultClassSection(grade), { shouldValidate: true });
    } else if (normalized !== section) {
      setValue('section', normalized, { shouldValidate: true });
    }
  }, [grade, section, setValue]);

  const titlePreview = useMemo(() => {
    if (!grade || !section || !term) return '';
    return buildTimetableTitle(
      grade,
      normalizeClassSection(grade, section),
      academicYear,
      term,
    );
  }, [grade, section, academicYear, term]);

  const handleCellChange = (
    day: TimetableDaySchedule['day'],
    period: number,
    field: 'subject' | 'teacherName' | 'room',
    value: string,
  ) => {
    setSchedule((prev) =>
      prev.map((dayRow) => {
        if (dayRow.day !== day) return dayRow;
        return {
          ...dayRow,
          periods: dayRow.periods.map((p) =>
            p.period === period ? { ...p, [field]: value } : p,
          ),
        };
      }),
    );
  };

  const submit = (data: z.infer<typeof schema>) => {
    onSubmit({
      ...data,
      section: normalizeClassSection(data.grade, data.section),
      schedule: normalizeTimetableSchedule(schedule),
    });
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6">
      <datalist id="timetable-subject-suggestions">
        {TIMETABLE_SUBJECT_OPTIONS.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <h3 className="text-sm font-bold text-slate-900">Class & term</h3>
        {titlePreview ? (
          <p className="rounded-lg bg-violet-50 px-3 py-2 text-sm font-medium text-violet-900">
            {titlePreview}
          </p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Grade *</Label>
            <Select value={grade} onValueChange={(v) => setValue('grade', v, { shouldValidate: true })}>
              <SelectTrigger>
                <SelectValue placeholder="Select grade" />
              </SelectTrigger>
              <SelectContent>
                {EXAM_GRADES.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.grade && <p className="mt-1 text-xs text-red-600">{errors.grade.message}</p>}
          </div>
          <ClassSectionSelect
            grade={grade}
            value={section}
            onValueChange={(v) => setValue('section', v, { shouldValidate: true })}
            error={errors.section?.message}
          />
          <div>
            <Label htmlFor="academicYear">Academic year *</Label>
            <Input
              id="academicYear"
              type="number"
              {...register('academicYear', { valueAsNumber: true })}
            />
            {errors.academicYear && (
              <p className="mt-1 text-xs text-red-600">{errors.academicYear.message}</p>
            )}
          </div>
          <div>
            <Label>Term *</Label>
            <Select value={term} onValueChange={(v) => setValue('term', v, { shouldValidate: true })}>
              <SelectTrigger>
                <SelectValue placeholder="Select term" />
              </SelectTrigger>
              <SelectContent>
                {getTimetableTermOptions().map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.term && <p className="mt-1 text-xs text-red-600">{errors.term.message}</p>}
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Optional notes for teachers or parents"
              rows={2}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Weekly schedule</h3>
            <p className="text-xs text-slate-500">Monday to Friday, 8 periods per day</p>
          </div>
        </div>
        <TimetableGrid schedule={schedule} editable onCellChange={handleCellChange} />
      </section>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={saving} className="min-h-10">
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving…' : submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
