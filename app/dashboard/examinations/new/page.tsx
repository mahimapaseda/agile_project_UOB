'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import { Header } from '@/components/layout/Header';
import { PageMain } from '@/components/layout/PageMain';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { addExamination } from '@/lib/firestore';
import { EXAM_GRADES, countCurriculumSubjects } from '@/lib/exam-subjects';
import { ExamSubjectPreview } from '@/components/examinations/ExamCurriculumPanel';
import { EXAM_TERM_OPTIONS, generateExaminationName } from '@/lib/examination-utils';
import { ClassSectionSelect } from '@/components/examinations/ClassSectionSelect';
import {
  getClassOptionsForGrade,
  getDefaultClassSection,
  normalizeClassSection,
} from '@/lib/grade-class-options';
import { useAuth } from '@/lib/auth-context';
import { AccessGate } from '@/components/auth/AccessGate';
import { canManageExams } from '@/lib/access-control';
import { AlertCircle, Save, ArrowLeft } from 'lucide-react';

const schema = z.object({
  examName: z.string().min(2, 'Examination name required'),
  year: z.number().int().min(2000).max(2100),
  term: z.string().min(1, 'Term required'),
  grade: z.string().min(1, 'Grade required'),
  section: z.string().min(1, 'Class required'),
  examDate: z.string().min(1, 'Date required'),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const defaultYear = new Date().getFullYear();
const defaultTerm = 'Term 1';

function NewExaminationPageContent() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { userProfile } = useAuth();

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      examName: generateExaminationName(defaultYear, defaultTerm),
      year: defaultYear,
      term: defaultTerm,
      grade: '',
      section: '',
      examDate: new Date().toISOString().split('T')[0],
    },
  });

  const year = watch('year');
  const term = watch('term');
  const grade = watch('grade');
  const section = watch('section');

  useEffect(() => {
    if (year && term) {
      setValue('examName', generateExaminationName(year, term));
    }
  }, [year, term, setValue]);

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

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    setError('');
    try {
      if (!userProfile?.uid) {
        setError('You must be signed in to create an examination.');
        return;
      }
      const id = await addExamination({
        examName: data.examName,
        year: data.year,
        term: data.term,
        grade: data.grade,
        section: normalizeClassSection(data.grade, data.section),
        examDate: data.examDate,
        description: data.description?.trim() || undefined,
        totalSubjects: countCurriculumSubjects(data.grade) || undefined,
        createdBy: userProfile.uid,
      });
      router.push(`/dashboard/examinations/${id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('permission') || msg.includes('insufficient')) {
        setError('Permission denied. Sign in with a staff account and publish firestore.rules.');
      } else {
        setError(msg ? `Failed to create examination: ${msg}` : 'Failed to create examination. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Header title="New Examination" subtitle="Create an examination record" />
      <PageMain>
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl mx-auto space-y-6">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}
          <Card>
            <CardHeader><CardTitle>Examination Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Year *</Label>
                <Input type="number" {...register('year', { valueAsNumber: true })} min={2000} max={2100} />
              </div>
              <div className="space-y-1.5">
                <Label>Term *</Label>
                <Select
                  value={watch('term')}
                  onValueChange={(v) => setValue('term', v, { shouldValidate: true, shouldDirty: true })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXAM_TERM_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Examination Name</Label>
                <Input
                  {...register('examName')}
                  readOnly
                  className="bg-slate-50 text-slate-700"
                />
                <p className="text-xs text-slate-500">Auto-generated from year and term</p>
                {errors.examName && <p className="text-xs text-red-500">{errors.examName.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Grade *</Label>
                <Select
                  value={watch('grade')}
                  onValueChange={(v) => setValue('grade', v, { shouldValidate: true, shouldDirty: true })}
                >
                  <SelectTrigger><SelectValue placeholder="Select grade (6–13)" /></SelectTrigger>
                  <SelectContent>
                    {EXAM_GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.grade && <p className="text-xs text-red-500">{errors.grade.message}</p>}
              </div>
              <ClassSectionSelect
                grade={grade}
                value={section}
                onValueChange={(v) =>
                  setValue('section', v, { shouldValidate: true, shouldDirty: true })
                }
                error={errors.section?.message}
              />
              <div className="space-y-1.5">
                <Label>Exam Date *</Label>
                <Input type="date" {...register('examDate')} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Description</Label>
                <Textarea {...register('description')} placeholder="Optional description..." rows={2} />
              </div>
              {watch('grade') && (
                <ExamSubjectPreview grade={watch('grade')} section={section} className="sm:col-span-2" />
              )}
            </CardContent>
          </Card>
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pb-8">
            <Button type="button" variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            <Button type="submit" disabled={saving} className="w-full sm:w-auto">
              {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Create Examination</>}
            </Button>
          </div>
        </form>
      </PageMain>
    </>
  );
}

export default function NewExaminationPage() {
  return (
    <AccessGate allow={canManageExams}>
      <NewExaminationPageContent />
    </AccessGate>
  );
}
