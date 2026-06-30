export const EXAM_CLASS_OPTIONS = ['A', 'B', 'C'] as const;

export type ExamClass = (typeof EXAM_CLASS_OPTIONS)[number];

export const EXAM_TERM_OPTIONS = [
  { value: 'Term 1', label: 'Term 1' },
  { value: 'Term 2', label: 'Term 2' },
  { value: 'Term 3', label: 'Term 3' },
  { value: 'Annual', label: 'Annual' },
  { value: 'Mock Exam', label: 'Mock Exam' },
] as const;

/** e.g. year 2025 + "Term 1" → "term 1 Examination 2025" */
export function generateExaminationName(year: number, term: string): string {
  const termLabel = term.trim().toLowerCase();
  if (!termLabel || !Number.isFinite(year)) return '';
  return `${termLabel} Examination ${year}`;
}
