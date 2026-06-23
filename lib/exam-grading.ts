export type ExamLetterGrade = 'A' | 'B' | 'C' | 'S' | 'F';

/** Official examination grading scale (percentage). */
export const EXAM_GRADING_SCALE = [
  { grade: 'A' as const, label: 'Distinction', min: 75, max: 100 },
  { grade: 'B' as const, label: 'Very Good Pass', min: 65, max: 74.99 },
  { grade: 'C' as const, label: 'Credit', min: 50, max: 64.99 },
  { grade: 'S' as const, label: 'Ordinary Pass', min: 35, max: 49.99 },
  { grade: 'F' as const, label: 'Fail', min: 0, max: 34.99 },
];

export const SUBJECT_FAIL_PERCENT = 35;

export type SubjectMarkLike = {
  obtainedMarks: number;
  maxMarks: number;
  grade?: string;
  absent?: boolean;
};

export function isSubjectAbsent(
  subject: SubjectMarkLike | { grade?: string; absent?: boolean } | undefined,
): boolean {
  if (!subject) return false;
  if (subject.absent) return true;
  return subject.grade?.trim().toUpperCase() === 'AB';
}

export function subjectPercentage(subject: SubjectMarkLike): number {
  if (isSubjectAbsent(subject)) return 0;
  return subject.maxMarks > 0 ? (subject.obtainedMarks / subject.maxMarks) * 100 : 0;
}

/** True when any subject is absent (AB) or below 35%. */
export function hasFailingSubject(subjects: SubjectMarkLike[]): boolean {
  return subjects.some((s) => isSubjectAbsent(s) || subjectPercentage(s) < SUBJECT_FAIL_PERCENT);
}

export function getLetterGrade(percentage: number): ExamLetterGrade {
  if (percentage >= 75) return 'A';
  if (percentage >= 65) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 35) return 'S';
  return 'F';
}

/** Overall exam grade — forced F if any subject is below 35%. */
export function getResultLetterGrade(
  percentage: number,
  subjects?: SubjectMarkLike[],
): ExamLetterGrade {
  if (subjects?.length && hasFailingSubject(subjects)) return 'F';
  return getLetterGrade(percentage);
}

export function calcSubjectGrade(obtained: number, max: number): ExamLetterGrade {
  const pct = max > 0 ? (obtained / max) * 100 : 0;
  return getLetterGrade(pct);
}

/** Maps legacy W (weak) grades to F for display and new entries. */
export function normalizeExamGrade(grade: string): ExamLetterGrade | 'AB' | string {
  const g = grade.trim().toUpperCase();
  if (g === 'W') return 'F';
  if (g === 'AB') return 'AB';
  if (g === 'A' || g === 'B' || g === 'C' || g === 'S' || g === 'F') return g;
  return grade;
}

export function getGradeColor(grade: string): string {
  switch (normalizeExamGrade(grade)) {
    case 'A':
      return 'text-green-600';
    case 'B':
      return 'text-blue-600';
    case 'C':
      return 'text-yellow-600';
    case 'S':
      return 'text-orange-500';
    case 'AB':
      return 'text-amber-600';
    default:
      return 'text-red-600';
  }
}

export function getGradeLabel(grade: string): string {
  const normalized = normalizeExamGrade(grade);
  const entry = EXAM_GRADING_SCALE.find((s) => s.grade === normalized);
  return entry ? `${entry.grade} (${entry.label})` : grade;
}

export function isPassingPercentage(percentage: number): boolean {
  return percentage >= 35;
}

export function isPassingResult(percentage: number, subjects?: SubjectMarkLike[]): boolean {
  return getResultLetterGrade(percentage, subjects) !== 'F';
}

export function getGradeColorForPercentage(percentage: number): string {
  return getGradeColor(getLetterGrade(percentage));
}

export function getResultGradeColor(percentage: number, subjects?: SubjectMarkLike[]): string {
  return getGradeColor(getResultLetterGrade(percentage, subjects));
}
