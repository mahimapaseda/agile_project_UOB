'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { getExamination, syncExamResultsMetadata, updateExamination } from '@/lib/firestore';
import { Examination } from '@/types';
import { EXAM_GRADES, countCurriculumSubjects } from '@/lib/exam-subjects';
import { ExamSubjectPreview } from '@/components/examinations/ExamCurriculumPanel';
import { EXAM_TERM_OPTIONS, generateExaminationName } from '@/lib/examination-utils';
import { ClassSectionSelect } from '@/components/examinations/ClassSectionSelect';
import {
  getClassOptionsForGrade,
  getDefaultClassSection,
  normalizeClassSection,
} from '@/lib/grade-class-options';
import { AccessGate } from '@/components/auth/AccessGate';
import { canManageExams } from '@/lib/access-control';
import { Save, ArrowLeft, AlertCircle } from 'lucide-react';

const schema = z.object({
  examName: z.string().min(2),
  year: z.number().int().min(2000).max(2100),
  term: z.string().min(1),
  grade: z.string().min(1),
  section: z.string().min(1),
  examDate: z.string().min(1),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function EditExaminationPageContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [exam, setExam] = useState<Examination | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, setValue, watch, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const year = watch('year');
  const term = watch('term');
  const grade = watch('grade');
  const section = watch('section');

  useEffect(() => {
    getExamination(id).then(e => {
      setExam(e);
      if (e) {
        reset({
          examName: e.examName,
          year: e.year,
          term: e.term,
          grade: e.grade,
          section: normalizeClassSection(e.grade, e.section) || getDefaultClassSection(e.grade),
          examDate: e.examDate,
          description: e.description || '',
        });
      }
      setLoading(false);
    });
  }, [id, reset]);

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
      await updateExamination(id, {
        ...data,
        section: normalizeClassSection(data.grade, data.section),
        description: data.description || undefined,
        totalSubjects: countCurriculumSubjects(data.grade) || undefined,
      });
      if (exam && (data.grade !== exam.grade || data.examName !== exam.examName || data.year !== exam.year || data.term !== exam.term)) {
        await syncExamResultsMetadata(id, {
          grade: data.grade,
          examName: data.examName,
          year: data.year,
          term: data.term,
        });
      }
      router.push(`/dashboard/examinations/${id}`);
    } catch {
      setError('Failed to update. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header title="Edit Examination" />
        <PageMain className="flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </PageMain>
      </>
    );
  }

  return (
    <>
      <Header title="Edit Examination" subtitle={exam?.examName} />
      <PageMain>
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl mx-auto space-y-6">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}
          <Card>
            <CardHeader><CardTitle>Examination Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Year *</Label>
                <Input type="number" {...register('year', { valueAsNumber: true })} />
              </div>
              <div className="space-y-1.5">
                <Label>Term *</Label>
                <Select value={watch('term')} onValueChange={v => setValue('term', v)}>
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
                <Input {...register('examName')} readOnly className="bg-slate-50 text-slate-700" />
                <p className="text-xs text-slate-500">Auto-generated from year and term</p>
              </div>
              <div className="space-y-1.5">
                <Label>Grade *</Label>
                <Select value={watch('grade')} onValueChange={v => setValue('grade', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXAM_GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <ClassSectionSelect
                grade={grade}
                value={section}
                onValueChange={(v) => setValue('section', v)}
              />
              <div className="space-y-1.5">
                <Label>Exam Date *</Label>
                <Input type="date" {...register('examDate')} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Description</Label>
                <Textarea {...register('description')} rows={2} />
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
              {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Update Examination</>}
            </Button>
          </div>
        </form>
      </PageMain>
    </>
  );
}

export default function EditExaminationPage() {
  return (
    <AccessGate allow={canManageExams} redirectTo="/dashboard/examinations">
      <EditExaminationPageContent />
    </AccessGate>
  );
}
