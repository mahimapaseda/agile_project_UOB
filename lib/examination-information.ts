import { ExamResult, Examination, Staff } from '@/types';
import { isSubjectAbsent, SUBJECT_FAIL_PERCENT, subjectPercentage } from './exam-grading';
import { getAllowedGradesFromStaff, normalizeGradeLabel } from './grades-taught';
import { normalizeSubjectList, resolveCanonicalSubjectName, subjectsMatch } from './subject-names';

/** Pass threshold aligned with examinations module (35%). Field names kept for export compat. */
export const SUBJECT_PASS_PERCENT = SUBJECT_FAIL_PERCENT;

export const SCORE_BANDS = ['0-19', '20-39', '40-54', '55-64', '65-74', '75-100'] as const;
export type ScoreBand = (typeof SCORE_BANDS)[number];

export interface TeacherSubjectAnalysisRow {
  subject: string;
  teacherName: string;
  teacherStaffId: string | null;
  teachingGrades: string;
  totalStudents: number;
  below40: number;
  below40Pct: number;
  above40: number;
  above40Pct: number;
}

export interface GradeSubjectAnalysisRow {
  subject: string;
  grade: string;
  teacherName: string;
  teacherStaffId: string | null;
  studentsInClass: number;
  appeared: number;
  bands: Record<ScoreBand, number>;
  below40: number;
  below40Pct: number;
  above40: number;
  above40Pct: number;
}

function subjectPercent(obtained: number, max: number): number | null {
  if (!max || max <= 0) return null;
  return Math.round((obtained / max) * 1000) / 10;
}

export function getScoreBand(pct: number): ScoreBand {
  if (pct < 20) return '0-19';
  if (pct < 40) return '20-39';
  if (pct < 55) return '40-54';
  if (pct < 65) return '55-64';
  if (pct < 75) return '65-74';
  return '75-100';
}

function emptyBands(): Record<ScoreBand, number> {
  return { '0-19': 0, '20-39': 0, '40-54': 0, '55-64': 0, '65-74': 0, '75-100': 0 };
}

export function getStaffSubjectList(staff: Staff): string[] {
  const fromArray = staff.subjects ?? [];
  const fromTaught = (staff.subjectsTaught ?? '')
    .split(/[,;/\n&]+|\band\b/gi)
    .map((s) => s.trim())
    .filter(Boolean);
  const appointed = staff.appointedSubject?.trim();
  const combined = [...fromArray, ...fromTaught, ...(appointed ? [appointed] : [])];
  return normalizeSubjectList(combined);
}

function staffTeachesSubject(staff: Staff, subject: string): boolean {
  return getStaffSubjectList(staff).some((s) => subjectsMatch(s, subject));
}

function staffTeachesGrade(staff: Staff, grade: string): boolean {
  const grades = getAllowedGradesFromStaff(staff);
  if (!grades.length) return true;
  const normalized = normalizeGradeLabel(grade) ?? grade.trim();
  return grades.some((g) => g === normalized || g.toLowerCase() === grade.trim().toLowerCase());
}

export function resolveTeacherForSubject(
  staffList: Staff[],
  subject: string,
  grade: string,
): Staff | null {
  const academic = staffList.filter(
    (s) => s.status === 'active' && (s.staffType === 'academic' || staffTeachesSubject(s, subject)),
  );

  const gradeMatch = academic.filter(
    (s) => staffTeachesSubject(s, subject) && staffTeachesGrade(s, grade),
  );
  if (gradeMatch.length === 1) return gradeMatch[0];
  if (gradeMatch.length > 1) {
    return gradeMatch.sort((a, b) => a.name.localeCompare(b.name))[0];
  }

  const subjectOnly = academic.filter((s) => staffTeachesSubject(s, subject));
  if (subjectOnly.length === 1) return subjectOnly[0];
  if (subjectOnly.length > 1) {
    return subjectOnly.sort((a, b) => a.name.localeCompare(b.name))[0];
  }

  return null;
}

function formatTeachingGrades(staff: Staff | null): string {
  if (!staff) return '—';
  const grades = getAllowedGradesFromStaff(staff);
  if (!grades.length) return staff.gradesTaught?.trim() || '—';
  return grades.join(', ');
}

function pctOf(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

export interface SubjectStudentDetail {
  studentName: string;
  admissionNumber: string;
  grade: string;
  obtainedMarks: number;
  maxMarks: number;
  percentage: number;
  band: ScoreBand;
  passed: boolean;
}

export interface TeacherSubjectDetailSummary {
  subject: string;
  teacherName: string;
  teacherStaffId: string | null;
  teachingGrades: string;
  teacher: Staff | null;
  totalStudents: number;
  below40: number;
  below40Pct: number;
  above40: number;
  above40Pct: number;
  averagePct: number;
  highestPct: number;
  lowestPct: number;
  bands: Record<ScoreBand, number>;
  gradeBreakdown: {
    grade: string;
    count: number;
    below40: number;
    above40: number;
    averagePct: number;
  }[];
  students: SubjectStudentDetail[];
}

function matchesTeacherRow(
  subject: string,
  teacher: Staff | null,
  row: TeacherSubjectAnalysisRow,
): boolean {
  if (!subjectsMatch(subject, row.subject)) return false;
  if (row.teacherStaffId && teacher?.staffId) {
    return row.teacherStaffId.trim().toUpperCase() === teacher.staffId.trim().toUpperCase();
  }
  const teacherName = teacher?.name ?? 'Unassigned';
  return row.teacherName === teacherName;
}

function matchesGradeSubjectRow(
  subject: string,
  grade: string,
  teacher: Staff | null,
  row: GradeSubjectAnalysisRow,
): boolean {
  if (!subjectsMatch(subject, row.subject)) return false;
  const resultGrade = normalizeGradeLabel(grade) ?? grade.trim();
  const rowGrade = normalizeGradeLabel(row.grade) ?? row.grade.trim();
  if (resultGrade !== rowGrade) return false;
  if (row.teacherStaffId && teacher?.staffId) {
    return row.teacherStaffId.trim().toUpperCase() === teacher.staffId.trim().toUpperCase();
  }
  const teacherName = teacher?.name ?? 'Unassigned';
  return row.teacherName === teacherName;
}

export interface GradeSubjectAbsentStudent {
  studentName: string;
  admissionNumber: string;
}

export interface GradeSubjectDetailSummary {
  subject: string;
  grade: string;
  teacherName: string;
  teacherStaffId: string | null;
  teachingGrades: string;
  teacher: Staff | null;
  studentsInClass: number;
  appeared: number;
  notAppeared: number;
  below40: number;
  below40Pct: number;
  above40: number;
  above40Pct: number;
  averagePct: number;
  highestPct: number;
  lowestPct: number;
  bands: Record<ScoreBand, number>;
  students: SubjectStudentDetail[];
  absentStudents: GradeSubjectAbsentStudent[];
}

/** Full breakdown for one Part 2 row (subject + grade + teacher). */
export function buildGradeSubjectDetail(
  results: ExamResult[],
  staffList: Staff[],
  row: GradeSubjectAnalysisRow,
): GradeSubjectDetailSummary {
  const teacher =
    (row.teacherStaffId
      ? staffList.find((s) => s.staffId.trim().toUpperCase() === row.teacherStaffId!.trim().toUpperCase())
      : null) ??
    staffList.find((s) => s.name === row.teacherName) ??
    null;

  const rowGrade = normalizeGradeLabel(row.grade) ?? row.grade.trim();
  const students: SubjectStudentDetail[] = [];
  const appearedAdmissionNumbers = new Set<string>();

  for (const result of results) {
    const grade = normalizeGradeLabel(result.grade) ?? result.grade.trim();
    if (grade !== rowGrade) continue;

    for (const sub of result.subjects) {
      const pct = subjectPercentage(sub);
      if (sub.maxMarks <= 0) continue;

      const resolved = resolveTeacherForSubject(staffList, sub.subject, grade);
      if (!matchesGradeSubjectRow(sub.subject, grade, resolved, row)) continue;

      appearedAdmissionNumbers.add(result.admissionNumber);
      const passed = !isSubjectAbsent(sub) && pct >= SUBJECT_PASS_PERCENT;

      students.push({
        studentName: result.studentName,
        admissionNumber: result.admissionNumber,
        grade,
        obtainedMarks: sub.obtainedMarks,
        maxMarks: sub.maxMarks,
        percentage: isSubjectAbsent(sub) ? 0 : pct,
        band: getScoreBand(isSubjectAbsent(sub) ? 0 : pct),
        passed,
      });
    }
  }

  students.sort((a, b) => a.studentName.localeCompare(b.studentName));

  const absentStudents: GradeSubjectAbsentStudent[] = results
    .filter((result) => {
      const grade = normalizeGradeLabel(result.grade) ?? result.grade.trim();
      return grade === rowGrade && !appearedAdmissionNumbers.has(result.admissionNumber);
    })
    .map((result) => ({
      studentName: result.studentName,
      admissionNumber: result.admissionNumber,
    }))
    .sort((a, b) => a.studentName.localeCompare(b.studentName));

  const pcts = students.map((s) => s.percentage);
  const bands = emptyBands();
  for (const s of students) {
    bands[s.band] += 1;
  }

  const studentsInClass = results.filter((result) => {
    const grade = normalizeGradeLabel(result.grade) ?? result.grade.trim();
    return grade === rowGrade;
  }).length;

  return {
    subject: row.subject,
    grade: row.grade,
    teacherName: row.teacherName,
    teacherStaffId: row.teacherStaffId,
    teachingGrades: formatTeachingGrades(teacher),
    teacher,
    studentsInClass,
    appeared: students.length,
    notAppeared: absentStudents.length,
    below40: students.filter((s) => !s.passed).length,
    below40Pct: pctOf(students.filter((s) => !s.passed).length, students.length),
    above40: students.filter((s) => s.passed).length,
    above40Pct: pctOf(students.filter((s) => s.passed).length, students.length),
    averagePct: pcts.length
      ? Math.round((pcts.reduce((a, b) => a + b, 0) / pcts.length) * 10) / 10
      : 0,
    highestPct: pcts.length ? Math.max(...pcts) : 0,
    lowestPct: pcts.length ? Math.min(...pcts) : 0,
    bands,
    students,
    absentStudents,
  };
}

/** Full breakdown for one Part 1 row (subject + teacher). */
export function buildTeacherSubjectDetail(
  results: ExamResult[],
  staffList: Staff[],
  row: TeacherSubjectAnalysisRow,
): TeacherSubjectDetailSummary {
  const teacher =
    (row.teacherStaffId
      ? staffList.find((s) => s.staffId.trim().toUpperCase() === row.teacherStaffId!.trim().toUpperCase())
      : null) ??
    staffList.find((s) => s.name === row.teacherName) ??
    null;

  const students: SubjectStudentDetail[] = [];
  const gradeMap = new Map<
    string,
    { pcts: number[]; below40: number; above40: number }
  >();

  for (const result of results) {
    for (const sub of result.subjects) {
      const pct = subjectPercentage(sub);
      if (sub.maxMarks <= 0) continue;

      const resolved = resolveTeacherForSubject(staffList, sub.subject, result.grade);
      if (!matchesTeacherRow(sub.subject, resolved, row)) continue;

      const grade = normalizeGradeLabel(result.grade) ?? result.grade.trim();
      const passed = !isSubjectAbsent(sub) && pct >= SUBJECT_PASS_PERCENT;

      students.push({
        studentName: result.studentName,
        admissionNumber: result.admissionNumber,
        grade,
        obtainedMarks: sub.obtainedMarks,
        maxMarks: sub.maxMarks,
        percentage: isSubjectAbsent(sub) ? 0 : pct,
        band: getScoreBand(isSubjectAbsent(sub) ? 0 : pct),
        passed,
      });

      if (!gradeMap.has(grade)) {
        gradeMap.set(grade, { pcts: [], below40: 0, above40: 0 });
      }
      const g = gradeMap.get(grade)!;
      g.pcts.push(pct);
      if (passed) g.above40 += 1;
      else g.below40 += 1;
    }
  }

  students.sort((a, b) => a.studentName.localeCompare(b.studentName));

  const pcts = students.map((s) => s.percentage);
  const bands = emptyBands();
  for (const s of students) {
    bands[s.band] += 1;
  }

  const gradeBreakdown = [...gradeMap.entries()]
    .map(([grade, data]) => ({
      grade,
      count: data.pcts.length,
      below40: data.below40,
      above40: data.above40,
      averagePct: data.pcts.length
        ? Math.round((data.pcts.reduce((a, b) => a + b, 0) / data.pcts.length) * 10) / 10
        : 0,
    }))
    .sort((a, b) => a.grade.localeCompare(b.grade));

  return {
    subject: row.subject,
    teacherName: row.teacherName,
    teacherStaffId: row.teacherStaffId,
    teachingGrades: row.teachingGrades,
    teacher,
    totalStudents: students.length,
    below40: students.filter((s) => !s.passed).length,
    below40Pct: pctOf(students.filter((s) => !s.passed).length, students.length),
    above40: students.filter((s) => s.passed).length,
    above40Pct: pctOf(students.filter((s) => s.passed).length, students.length),
    averagePct: pcts.length
      ? Math.round((pcts.reduce((a, b) => a + b, 0) / pcts.length) * 10) / 10
      : 0,
    highestPct: pcts.length ? Math.max(...pcts) : 0,
    lowestPct: pcts.length ? Math.min(...pcts) : 0,
    bands,
    gradeBreakdown,
    students,
  };
}

export function buildExamReportTitle(exam: Examination): string {
  const term = exam.term?.trim() || exam.examName;
  return `${exam.year} — ${term} · Subject analysis`;
}

/** Part 1 — one row per subject + teacher (exam-wide). */
export function buildTeacherSubjectAnalysis(
  results: ExamResult[],
  staffList: Staff[],
): TeacherSubjectAnalysisRow[] {
  type Acc = {
    subject: string;
    teacher: Staff | null;
    pcts: number[];
  };

  const map = new Map<string, Acc>();

  for (const result of results) {
    for (const sub of result.subjects) {
      const pct = subjectPercentage(sub);
      if (sub.maxMarks <= 0) continue;

      const teacher = resolveTeacherForSubject(staffList, sub.subject, result.grade);
      const key = `${resolveCanonicalSubjectName(sub.subject) ?? sub.subject}::${teacher?.id ?? 'none'}`;

      if (!map.has(key)) {
        map.set(key, { subject: sub.subject, teacher, pcts: [] });
      }
      map.get(key)!.pcts.push(pct);
    }
  }

  const rows: TeacherSubjectAnalysisRow[] = [];

  for (const { subject, teacher, pcts } of map.values()) {
    const total = pcts.length;
    const below40 = pcts.filter((p) => p < SUBJECT_PASS_PERCENT).length;
    const above40 = pcts.filter((p) => p >= SUBJECT_PASS_PERCENT).length;

    rows.push({
      subject,
      teacherName: teacher?.name ?? 'Unassigned',
      teacherStaffId: teacher?.staffId ?? null,
      teachingGrades: formatTeachingGrades(teacher),
      totalStudents: total,
      below40,
      below40Pct: pctOf(below40, total),
      above40,
      above40Pct: pctOf(above40, total),
    });
  }

  return rows.sort(
    (a, b) => a.subject.localeCompare(b.subject) || a.teacherName.localeCompare(b.teacherName),
  );
}

/** Part 2 — subject × grade × teacher with mark bands. */
export function buildGradeSubjectAnalysis(
  results: ExamResult[],
  staffList: Staff[],
): GradeSubjectAnalysisRow[] {
  const classSizeByGrade = new Map<string, Set<string>>();
  for (const r of results) {
    const grade = normalizeGradeLabel(r.grade) ?? r.grade.trim();
    if (!classSizeByGrade.has(grade)) classSizeByGrade.set(grade, new Set());
    classSizeByGrade.get(grade)!.add(r.admissionNumber);
  }

  type Acc = {
    subject: string;
    grade: string;
    teacher: Staff | null;
    pcts: number[];
  };

  const map = new Map<string, Acc>();

  for (const result of results) {
    const grade = normalizeGradeLabel(result.grade) ?? result.grade.trim();

    for (const sub of result.subjects) {
      const pct = subjectPercentage(sub);
      if (sub.maxMarks <= 0) continue;

      const teacher = resolveTeacherForSubject(staffList, sub.subject, grade);
      const key = `${resolveCanonicalSubjectName(sub.subject) ?? sub.subject}::${grade}::${teacher?.id ?? 'none'}`;

      if (!map.has(key)) {
        map.set(key, { subject: sub.subject, grade, teacher, pcts: [] });
      }
      map.get(key)!.pcts.push(pct);
    }
  }

  const rows: GradeSubjectAnalysisRow[] = [];

  for (const { subject, grade, teacher, pcts } of map.values()) {
    const appeared = pcts.length;
    const below40 = pcts.filter((p) => p < SUBJECT_PASS_PERCENT).length;
    const above40 = pcts.filter((p) => p >= SUBJECT_PASS_PERCENT).length;
    const bands = emptyBands();
    for (const p of pcts) {
      bands[getScoreBand(p)] += 1;
    }

    rows.push({
      subject,
      grade,
      teacherName: teacher?.name ?? 'Unassigned',
      teacherStaffId: teacher?.staffId ?? null,
      studentsInClass: classSizeByGrade.get(grade)?.size ?? appeared,
      appeared,
      bands,
      below40,
      below40Pct: pctOf(below40, appeared),
      above40,
      above40Pct: pctOf(above40, appeared),
    });
  }

  return rows.sort(
    (a, b) =>
      a.grade.localeCompare(b.grade) ||
      a.subject.localeCompare(b.subject) ||
      a.teacherName.localeCompare(b.teacherName),
  );
}

export function formatPct(value: number): string {
  return `${value.toFixed(1)}%`;
}
