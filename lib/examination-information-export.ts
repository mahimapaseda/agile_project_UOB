import type { ExportColumn } from '@/lib/record-export-fields';
import { Examination } from '@/types';
import {
  formatPct,
  SCORE_BANDS,
  type GradeSubjectAnalysisRow,
  type TeacherSubjectAnalysisRow,
} from '@/lib/examination-information';

export const EXAM_INFO_TEACHER_EXPORT_FIELDS: ExportColumn<TeacherSubjectAnalysisRow>[] = [
  { key: 'subject', label: 'Subject', getValue: (r) => r.subject },
  { key: 'teacherName', label: 'Name of the teacher', getValue: (r) => r.teacherName },
  { key: 'teachingGrades', label: 'Teaching grades', getValue: (r) => r.teachingGrades },
  { key: 'totalStudents', label: 'No of students', getValue: (r) => String(r.totalStudents) },
  { key: 'below40', label: 'No of students below 35', getValue: (r) => String(r.below40) },
  {
    key: 'below40Pct',
    label: 'Percentage of below 35',
    getValue: (r) => formatPct(r.below40Pct),
  },
  { key: 'above40', label: 'No of students above 35', getValue: (r) => String(r.above40) },
  {
    key: 'above40Pct',
    label: 'Percentage of above 35',
    getValue: (r) => formatPct(r.above40Pct),
  },
];

export const EXAM_INFO_GRADE_EXPORT_FIELDS: ExportColumn<GradeSubjectAnalysisRow>[] = [
  { key: 'subject', label: 'Subject', getValue: (r) => r.subject },
  { key: 'grade', label: 'Grade', getValue: (r) => r.grade },
  { key: 'teacherName', label: 'Name of the teacher', getValue: (r) => r.teacherName },
  {
    key: 'studentsInClass',
    label: 'No of students in the class',
    getValue: (r) => String(r.studentsInClass),
  },
  {
    key: 'appeared',
    label: 'Number of students who appeared',
    getValue: (r) => String(r.appeared),
  },
  ...SCORE_BANDS.map((band) => ({
    key: `band-${band}`,
    label: band,
    getValue: (r: GradeSubjectAnalysisRow) => String(r.bands[band]),
  })),
  { key: 'below40', label: 'No of students below 35', getValue: (r) => String(r.below40) },
  {
    key: 'below40Pct',
    label: 'Percentage of below 35',
    getValue: (r) => formatPct(r.below40Pct),
  },
  { key: 'above40', label: 'No of students above 35', getValue: (r) => String(r.above40) },
  {
    key: 'above40Pct',
    label: 'Percentage of above 35',
    getValue: (r) => formatPct(r.above40Pct),
  },
];

export function filterTeacherRowsForExport(
  rows: TeacherSubjectAnalysisRow[],
  search: string,
): TeacherSubjectAnalysisRow[] {
  const q = search.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter(
    (r) =>
      r.subject.toLowerCase().includes(q) ||
      r.teacherName.toLowerCase().includes(q) ||
      r.teachingGrades.toLowerCase().includes(q),
  );
}

export function filterGradeRowsForExport(
  rows: GradeSubjectAnalysisRow[],
  search: string,
  gradeFilter: string,
): GradeSubjectAnalysisRow[] {
  const q = search.trim().toLowerCase();
  return rows.filter((r) => {
    if (gradeFilter !== 'all' && r.grade !== gradeFilter) return false;
    if (!q) return true;
    return (
      r.subject.toLowerCase().includes(q) ||
      r.teacherName.toLowerCase().includes(q) ||
      r.grade.toLowerCase().includes(q)
    );
  });
}

export function buildExamInfoExportTitle(exam: Examination, tab: 'teachers' | 'grades'): string {
  const part = tab === 'teachers' ? 'Part 1 · Teachers' : 'Part 2 · Mark bands';
  return `Examination Information — ${part} — ${exam.examName}`;
}

export function buildExamInfoExportPrefix(exam: Examination, tab: 'teachers' | 'grades'): string {
  const part = tab === 'teachers' ? 'teachers' : 'mark-bands';
  const slug = exam.examName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  return `exam-info-${part}-${exam.year}-${slug || 'report'}`;
}
