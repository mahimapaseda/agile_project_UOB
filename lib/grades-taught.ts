import { GRADES, type Grade, type Staff, type Student } from '@/types';

/** Parse "6,7,8", "Grade 10, Grade 11", "10-11", etc. into canonical `Grade` labels. */
export function parseGradesTaught(raw: string | undefined | null): Grade[] {
  if (!raw?.trim()) return [];

  const text = raw.trim();
  const lower = text.toLowerCase();
  if (
    lower.includes('all grades') ||
    lower === 'n/a' ||
    lower.startsWith('n/a —') ||
    lower.startsWith('n/a -')
  ) {
    return [...GRADES];
  }

  const tokens = text
    .split(/[,;/\n&]+|\band\b/gi)
    .map((t) => t.trim())
    .filter(Boolean);

  const out = new Set<Grade>();

  for (const token of tokens) {
    const normalized = normalizeGradeLabel(token);
    if (normalized) out.add(normalized);
  }

  return [...out];
}

/** Map "10", "grade 10", "Grade 10" → `Grade 10`. */
export function normalizeGradeLabel(value: string): Grade | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const direct = GRADES.find((g) => g.toLowerCase() === trimmed.toLowerCase());
  if (direct) return direct;

  const digits = trimmed.replace(/^grade\s*/i, '').trim();
  if (/^\d{1,2}$/.test(digits)) {
    const label = `Grade ${parseInt(digits, 10)}` as Grade;
    return GRADES.includes(label) ? label : null;
  }

  const range = trimmed.match(/^(\d{1,2})\s*[-–]\s*(\d{1,2})$/);
  if (range) {
    const start = parseInt(range[1], 10);
    const end = parseInt(range[2], 10);
    const grades: Grade[] = [];
    for (let n = Math.min(start, end); n <= Math.max(start, end); n++) {
      const label = `Grade ${n}` as Grade;
      if (GRADES.includes(label)) grades.push(label);
    }
    return grades[0] ?? null;
  }

  return null;
}

export function getAllowedGradesFromStaff(staff: Pick<Staff, 'gradesTaught'> | null | undefined): Grade[] {
  return parseGradesTaught(staff?.gradesTaught);
}

export function studentInAllowedGrades(
  student: Pick<Student, 'grade'>,
  allowedGrades: readonly string[],
): boolean {
  if (!allowedGrades.length) return false;
  const studentGrade = normalizeGradeLabel(student.grade) ?? student.grade.trim();
  return allowedGrades.some(
    (g) => g === studentGrade || g.toLowerCase() === student.grade.trim().toLowerCase(),
  );
}

export function filterStudentsByAllowedGrades<T extends Pick<Student, 'grade'>>(
  students: T[],
  allowedGrades: readonly string[],
): T[] {
  if (!allowedGrades.length) return [];
  return students.filter((s) => studentInAllowedGrades(s, allowedGrades));
}
