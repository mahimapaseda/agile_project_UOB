'use client';

import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getStudents } from '@/lib/firestore';
import { addResult } from '@/lib/firestore';
import { Examination, ExamResult, Student } from '@/types';
import { classSectionsMatch, isAdvancedLevelGrade, resolveALStreamSubjectKey } from '@/lib/grade-class-options';
import { useAuth } from '@/lib/auth-context';
import {
  AESTHETIC_STUDIES_LABEL,
  AL_SUBJECT_COUNT,
  countCurriculumSubjects,
  findSelectOneGroupForSubject,
  getCoreSubjectsForGrade,
  getSelectOneGroupsForGrade,
  getSelectOneOptionsForGrade,
  getSubjectsForExamination,
  isGrade6to9,
  isValidScienceALSubjectSet,
  normalizeSubjectForSelectOneGroup,
  parseALSubjectsFromProfile,
} from '@/lib/exam-subjects';
import { calcSubjectGrade, getGradeColor } from '@/lib/exam-grading';
import { resolveCanonicalSubjectName, subjectsMatch } from '@/lib/subject-names';
import { Plus, Trash2, AlertCircle, ListPlus } from 'lucide-react';

const subjectSchema = z.object({
  subject: z.string().min(1, 'Required'),
  maxMarks: z.number().min(1),
  obtainedMarks: z.number().min(0),
  grade: z.string().min(1, 'Required'),
  absent: z.boolean().optional(),
});

const schema = z.object({
  studentId: z.string().min(1, 'Select a student'),
  subjects: z.array(subjectSchema).min(1, 'Add at least one subject'),
  rank: z.number().optional(),
  remarks: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface AddResultDialogProps {
  exam: Examination;
  existingStudentIds: string[];
  onClose: () => void;
  onAdded: (result: ExamResult) => void;
}

function emptySubjectRow() {
  return { subject: '', maxMarks: 100, obtainedMarks: 0, grade: 'S' as const, absent: false };
}

export function AddResultDialog({ exam, existingStudentIds, onClose, onAdded }: AddResultDialogProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { userProfile } = useAuth();

  const isALExam = isAdvancedLevelGrade(exam.grade);
  const alStreamKey = resolveALStreamSubjectKey(exam.section);
  const gradeSubjects = getSubjectsForExamination(exam.grade, exam.section);
  const coreSubjects = getCoreSubjectsForGrade(exam.grade);
  const selectOneGroups = getSelectOneGroupsForGrade(exam.grade);
  const selectOneOptions = getSelectOneOptionsForGrade(exam.grade);
  const selectOneSet = new Set(selectOneOptions);
  const hasSelectOne = selectOneGroups.length > 0;
  const lockCoreSubjects = hasSelectOne;
  const coreSubjectSet = new Set(coreSubjects);
  const expectedSubjectCount = countCurriculumSubjects(exam.grade, exam.section);

  useEffect(() => {
    getStudents(exam.grade, 'active').then((all) => {
      const inClass = exam.section
        ? all.filter((s) => classSectionsMatch(exam.grade, s.section, exam.section))
        : all;
      setStudents(inClass.filter((s) => !existingStudentIds.includes(s.id)));
    });
  }, [exam.grade, exam.section, existingStudentIds]);

  const { register, handleSubmit, setValue, watch, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      studentId: '',
      subjects: isALExam
        ? [emptySubjectRow(), emptySubjectRow(), emptySubjectRow()]
        : [emptySubjectRow()],
      remarks: '',
    },
  });

  const { fields, append, remove, replace } = useFieldArray({ control, name: 'subjects' });

  const selectedStudentId = watch('studentId');
  const selectedStudent = students.find((s) => s.id === selectedStudentId);
  const subjects = watch('subjects');

  const defaultForSelectOneGroup = (groupTitle: string): string => {
    if (groupTitle === AESTHETIC_STUDIES_LABEL && isGrade6to9(exam.grade)) {
      return (
        normalizeSubjectForSelectOneGroup(
          exam.grade,
          groupTitle,
          selectedStudent?.aestheticsSubject,
        ) ?? selectOneGroups.find((g) => g.title === groupTitle)?.subjects[0] ?? ''
      );
    }
    const group = selectOneGroups.find((g) => g.title === groupTitle);
    return group?.subjects[0] ?? '';
  };

  /** Options shown in a row's subject dropdown. Elective rows show only that group's options. */
  const rowOptions = (currentSubject: string, rowIndex: number): string[] => {
    if (isALExam) {
      const selected = new Set(
        subjects.map((s, i) => (i === rowIndex ? '' : s.subject)).filter(Boolean),
      );
      return gradeSubjects.filter((s) => !selected.has(s) || s === currentSubject);
    }
    if (!hasSelectOne) return gradeSubjects;
    const group = findSelectOneGroupForSubject(exam.grade, currentSubject);
    if (group) return [...group.subjects];
    return [...coreSubjects, ...selectOneOptions];
  };

  const totalMax = subjects.reduce((s, sub) => s + (Number(sub.maxMarks) || 0), 0);
  const totalObtained = subjects.reduce((s, sub) => s + (Number(sub.obtainedMarks) || 0), 0);
  const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;

  const toRow = (subject: string) => ({ subject, maxMarks: 100, obtainedMarks: 0, grade: 'S', absent: false });

  /** Core subjects + one row per select-one group (Bucket Subject I, Aesthetic Studies, etc.). */
  const buildGradeRows = () => {
    const rows = coreSubjects.map(toRow);
    for (const group of selectOneGroups) {
      rows.push(toRow(defaultForSelectOneGroup(group.title)));
    }
    return rows.length > 0 ? rows : [emptySubjectRow()];
  };

  /** Three subject rows for A/L — pre-filled from the student profile when available. */
  const buildALRows = (student?: Student) => {
    const fromProfile = parseALSubjectsFromProfile(student?.aestheticsSubject, alStreamKey ?? undefined);
    const pool = new Set(gradeSubjects);
    const picked = fromProfile.filter((s) => pool.has(s)).slice(0, AL_SUBJECT_COUNT);
    while (picked.length < AL_SUBJECT_COUNT) picked.push('');
    return picked.map((subject) => (subject ? toRow(subject) : emptySubjectRow()));
  };

  const loadCoreSubjects = () => replace(buildGradeRows());

  const loadAllSubjects = () => {
    if (isALExam) {
      replace(buildALRows(selectedStudent));
      return;
    }
    if (hasSelectOne) {
      replace(buildGradeRows());
      return;
    }
    const rows = gradeSubjects.map(toRow);
    replace(rows.length > 0 ? rows : [emptySubjectRow()]);
  };

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    setError('');
    try {
      const student = students.find((s) => s.id === data.studentId);
      if (!student) throw new Error('Student not found');

      if (isALExam) {
        const filled = data.subjects.filter((s) => s.subject.trim());
        const unique = new Set(filled.map((s) => s.subject));
        const pool = new Set(gradeSubjects);
        if (filled.length !== AL_SUBJECT_COUNT) {
          throw new Error(`Grade 12–13 results require exactly ${AL_SUBJECT_COUNT} subjects.`);
        }
        if (unique.size !== AL_SUBJECT_COUNT) {
          throw new Error('Each A/L subject must be different.');
        }
        for (const sub of filled) {
          const inPool = [...pool].some((candidate) =>
            subjectsMatch(candidate, sub.subject, {
              grade: exam.grade,
              section: exam.section,
              candidates: gradeSubjects,
            }),
          );
          if (!inPool) {
            throw new Error(`"${sub.subject}" is not in this stream's subject pool.`);
          }
        }
        if (
          alStreamKey === 'science' &&
          !isValidScienceALSubjectSet(filled.map((s) => s.subject))
        ) {
          throw new Error(
            'Science results must be all Maths track (Combined Maths, Physics, Chemistry, ICT) or all Bio track (Biology, Chemistry, Physics, Agriculture).',
          );
        }
      }

      const subjectsToSave = isALExam
        ? data.subjects.filter((s) => s.subject.trim())
        : data.subjects.filter((s) => s.subject.trim());

      if (!isALExam && subjectsToSave.length !== expectedSubjectCount) {
        throw new Error(
          `${exam.grade} results require exactly ${expectedSubjectCount} subjects (found ${subjectsToSave.length}).`,
        );
      }

      const processedSubjects = subjectsToSave.map((sub) => {
        const subject =
          resolveCanonicalSubjectName(sub.subject, {
            grade: exam.grade,
            section: exam.section,
            candidates: gradeSubjects,
          }) ?? sub.subject.trim();

        if (sub.absent) {
          return {
            ...sub,
            subject,
            maxMarks: Number(sub.maxMarks),
            obtainedMarks: 0,
            grade: 'AB',
            absent: true,
          };
        }
        return {
          ...sub,
          subject,
          maxMarks: Number(sub.maxMarks),
          obtainedMarks: Number(sub.obtainedMarks),
          grade: calcSubjectGrade(Number(sub.obtainedMarks), Number(sub.maxMarks)),
          absent: false,
        };
      });

      const totalMaxMarks = processedSubjects.reduce((s, sub) => s + sub.maxMarks, 0);
      const totalObtainedMarks = processedSubjects.reduce((s, sub) => s + sub.obtainedMarks, 0);
      const pct = totalMaxMarks > 0 ? (totalObtainedMarks / totalMaxMarks) * 100 : 0;

      const payload: Omit<ExamResult, 'id' | 'createdAt' | 'updatedAt'> = {
        studentId: student.id,
        studentName: student.name,
        admissionNumber: student.admissionNumber,
        examinationId: exam.id,
        examName: exam.examName,
        grade: exam.grade,
        year: exam.year,
        term: exam.term,
        subjects: processedSubjects,
        totalMaxMarks,
        totalObtainedMarks,
        percentage: pct,
        rank: data.rank || undefined,
        remarks: data.remarks || undefined,
        createdBy: userProfile?.uid || '',
      };

      const newId = await addResult(payload);
      onAdded({ id: newId, ...payload } as ExamResult);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save result. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="flex w-[calc(100vw-1rem)] max-h-[min(92dvh,900px)] flex-col gap-0 overflow-hidden p-0 sm:w-full sm:!max-w-5xl md:!max-w-6xl lg:!max-w-7xl">
        <DialogHeader className="shrink-0 border-b border-gray-100">
          <DialogTitle>Add Student Result</DialogTitle>
          <p className="text-sm text-gray-500">
            {exam.examName} · {exam.term} {exam.year} · {exam.grade}
          </p>
          {gradeSubjects.length > 0 && (
            <p className="text-xs text-purple-600">
              {isALExam
                ? `${expectedSubjectCount} subjects per student from ${exam.section ?? 'stream'} pool`
                : hasSelectOne
                  ? `${expectedSubjectCount} subjects per student (${selectOneGroups.map((g) => g.title).join(' + ')})`
                  : `${gradeSubjects.length} curriculum subjects for this grade`}
            </p>
          )}
          {isALExam && !alStreamKey && (
            <p className="text-xs text-amber-700">Set the exam stream to load A/L subject options.</p>
          )}
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="shrink-0 space-y-4 px-4 pt-4 sm:px-6">
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Student *</Label>
              <Select onValueChange={(v) => setValue('studentId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder={students.length === 0 ? 'No eligible students' : 'Select student...'} />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.admissionNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.studentId && <p className="text-xs text-red-500">{errors.studentId.message}</p>}
              {selectedStudent && isGrade6to9(exam.grade) && !selectedStudent.aestheticsSubject && (
                <p className="text-xs text-amber-700">
                  Set {AESTHETIC_STUDIES_LABEL} on this student&apos;s profile before loading subjects.
                </p>
              )}
              {selectedStudent && isALExam && !selectedStudent.aestheticsSubject && (
                <p className="text-xs text-amber-700">
                  Set A/L subjects on this student&apos;s profile to pre-fill the 3 subject rows.
                </p>
              )}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col px-4 sm:px-6">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 py-2">
              <Label>Subject Results *</Label>
              <div className="flex flex-wrap gap-1.5">
                {isALExam ? (
                  gradeSubjects.length > 0 && (
                    <Button type="button" variant="outline" size="sm" onClick={loadAllSubjects}>
                      <ListPlus className="w-3 h-3" /> Load {AL_SUBJECT_COUNT} subjects
                    </Button>
                  )
                ) : hasSelectOne ? (
                  coreSubjects.length > 0 && (
                    <Button type="button" variant="outline" size="sm" onClick={loadCoreSubjects}>
                      <ListPlus className="w-3 h-3" /> Load subjects
                    </Button>
                  )
                ) : (
                  <>
                    {coreSubjects.length > 0 && (
                      <Button type="button" variant="outline" size="sm" onClick={loadCoreSubjects}>
                        <ListPlus className="w-3 h-3" /> Load core
                      </Button>
                    )}
                    {gradeSubjects.length > 0 && (
                      <Button type="button" variant="outline" size="sm" onClick={loadAllSubjects}>
                        <ListPlus className="w-3 h-3" /> Load all
                      </Button>
                    )}
                  </>
                )}
                {!isALExam && (
                  <Button type="button" variant="outline" size="sm" onClick={() => append(emptySubjectRow())}>
                    <Plus className="w-3 h-3" /> Add
                  </Button>
                )}
              </div>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {fields.map((field, idx) => {
                const isAbsent = Boolean(subjects[idx]?.absent);
                const max = Number(subjects[idx]?.maxMarks) || 100;
                const obtained = Number(subjects[idx]?.obtainedMarks) || 0;
                const autoGrade = isAbsent ? 'AB' : calcSubjectGrade(obtained, max);
                const selectedSubject = subjects[idx]?.subject;
                const activeSelectOneGroup = findSelectOneGroupForSubject(
                  exam.grade,
                  selectedSubject,
                );
                const resolvedSelectOne = activeSelectOneGroup
                  ? normalizeSubjectForSelectOneGroup(
                      exam.grade,
                      activeSelectOneGroup.title,
                      selectedSubject,
                    ) ?? selectedSubject
                  : selectedSubject;
                const isSelectOneRow =
                  hasSelectOne &&
                  !!selectedSubject &&
                  (selectOneSet.has(selectedSubject) ||
                    !!activeSelectOneGroup);
                const isLockedCoreRow =
                  lockCoreSubjects &&
                  !!selectedSubject &&
                  coreSubjectSet.has(selectedSubject);
                return (
                  <div key={field.id} className="grid grid-cols-12 gap-2 items-start bg-gray-50 rounded-lg p-2">
                    <div className="col-span-12 sm:col-span-5">
                      {isLockedCoreRow ? (
                        <>
                          <input type="hidden" {...register(`subjects.${idx}.subject`)} />
                          <div className="flex h-11 sm:h-9 items-center rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-gray-900">
                            {selectedSubject}
                          </div>
                        </>
                      ) : (
                      <Select
                        value={resolvedSelectOne || selectedSubject || undefined}
                        onValueChange={(v) => setValue(`subjects.${idx}.subject`, v)}
                      >
                        <SelectTrigger className="h-11 sm:h-9 text-sm sm:text-xs">
                          {isSelectOneRow && activeSelectOneGroup ? (
                            <span className="truncate">
                              {activeSelectOneGroup.title}
                              {resolvedSelectOne && (
                                <span className="text-gray-400"> · {resolvedSelectOne}</span>
                              )}
                            </span>
                          ) : (
                            <SelectValue placeholder="Subject" />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          {(() => {
                            const opts = rowOptions(selectedSubject || '', idx);
                            const list = opts.length > 0 ? opts : [selectedSubject].filter(Boolean);
                            return list.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ));
                          })()}
                        </SelectContent>
                      </Select>
                      )}
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <Input
                        {...register(`subjects.${idx}.maxMarks`, { valueAsNumber: true })}
                        type="number"
                        min={1}
                        placeholder="Max"
                        className="h-11 sm:h-9 text-center"
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <Input
                        {...register(`subjects.${idx}.obtainedMarks`, { valueAsNumber: true })}
                        type="number"
                        min={0}
                        placeholder="Got"
                        className="h-11 sm:h-9 text-center"
                        disabled={isAbsent}
                      />
                    </div>
                    <div className="col-span-2 flex flex-col items-center justify-center gap-1">
                      <label className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700">
                        <input
                          type="checkbox"
                          className="rounded border-amber-300"
                          checked={isAbsent}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setValue(`subjects.${idx}.absent`, checked);
                            if (checked) {
                              setValue(`subjects.${idx}.obtainedMarks`, 0);
                              setValue(`subjects.${idx}.grade`, 'AB');
                            }
                          }}
                        />
                        AB
                      </label>
                      <span className={`text-sm font-bold ${getGradeColor(autoGrade)}`}>
                        {autoGrade}
                      </span>
                    </div>
                    <div className="col-span-2 sm:col-span-1 flex justify-end sm:justify-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="touch-target-icon h-11 w-11 sm:h-9 sm:w-9 text-red-400 hover:text-red-600"
                        onClick={() => remove(idx)}
                        disabled={fields.length <= 1 || isLockedCoreRow || (isALExam && fields.length <= AL_SUBJECT_COUNT)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 shrink-0 px-2 py-2 bg-blue-50 rounded-lg flex items-center justify-between">
              <span className="text-sm text-gray-600">
                Total: <strong>{totalObtained}</strong> / {totalMax}
              </span>
              <span className="text-sm font-bold text-blue-700">{percentage.toFixed(1)}%</span>
            </div>
          </div>

          <div className="shrink-0 space-y-4 border-t border-gray-100 px-4 py-4 sm:px-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Class Rank (Optional)</Label>
                <Input {...register('rank', { valueAsNumber: true })} type="number" min={1} placeholder="e.g. 5" />
              </div>
              <div className="space-y-1.5">
                <Label>Remarks (Optional)</Label>
                <Input {...register('remarks')} placeholder="e.g. Excellent performance" />
              </div>
            </div>

            <DialogFooter className="p-0 sm:p-0">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || students.length === 0}>
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{' '}
                  Saving...
                </>
              ) : (
                'Save Result'
              )}
            </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
