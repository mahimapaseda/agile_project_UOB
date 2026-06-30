import { Examination } from '@/types';
import { getSubjectsForExamination } from './exam-subjects';
import { normalizeGradeLabel } from './grades-taught';
import { findSubjectInList, subjectsMatch } from './subject-names';

export function examinationInAllowedGrades(
  exam: Pick<Examination, 'grade'>,
  allowedGrades: readonly string[],
): boolean {
  if (!allowedGrades.length) return false;
  const examGrade = normalizeGradeLabel(exam.grade) ?? exam.grade.trim();
  return allowedGrades.some(
    (g) => g === examGrade || g.toLowerCase() === exam.grade.trim().toLowerCase(),
  );
}

export function examinationIncludesSubject(
  exam: Pick<Examination, 'grade' | 'section'>,
  subject: string,
): boolean {
  if (!subject.trim()) return true;

  const curriculum = getSubjectsForExamination(exam.grade, exam.section);
  const options = { grade: exam.grade, section: exam.section, candidates: curriculum };

  if (findSubjectInList(subject, curriculum)) return true;

  return curriculum.some((curriculumSubject) =>
    subjectsMatch(curriculumSubject, subject, options),
  );
}
