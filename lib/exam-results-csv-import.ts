import { Examination, ExamResult, Student, SubjectResult } from '@/types';
import {
  AESTHETIC_STUDIES_LABEL,
  AL_SUBJECT_COUNT,
  BUCKET_SUBJECT_I_LABEL,
  BUCKET_SUBJECT_III_LABEL,
  ExamSubjectGroup,
  countCurriculumSubjects,
  getCoreSubjectsForGrade,
  getExamResultCsvColumns,
  getSelectOneChoiceColumnForGroup,
  getSelectOneGroupsForGrade,
  getSubjectsForExamination,
  isGrade6to9,
  isGrade10to11,
  isGrade12to13,
  isValidScienceALSubjectSet,
  normalizeALSubject,
  normalizeAestheticStudies10_11,
  normalizeBucketSubjectI,
  normalizeBucketSubjectIII,
  normalizeSubjectForSelectOneGroup,
} from './exam-subjects';
import { calcSubjectGrade } from './exam-grading';
import { computeExamRanks } from './exam-rank';
import { resolveALStreamSubjectKey, type ALStreamSubjectKey } from './grade-class-options';
import { findSubjectInList, resolveCanonicalSubjectName } from './subject-names';
import { isRowEmpty, parseCsv } from './student-csv-import';

const DEFAULT_MAX_MARKS = 100;

const ADMISSION_ALIASES = [
  'admission number',
  'admission no',
  'admission no.',
  'adm no',
  'adm. no.',
  'index number',
  'index no',
  'student id',
];

export interface ExamResultImportRowPreview {
  rowNumber: number;
  action: 'create' | 'update' | 'skip' | 'error';
  admissionNumber: string;
  studentName: string;
  subjectCount: number;
  percentage: number;
  messages: string[];
  existingResultId?: string;
  payload?: Omit<ExamResult, 'id' | 'createdAt' | 'updatedAt'>;
}

export interface ExamResultImportAnalysis {
  fileName: string;
  grade: string;
  examName: string;
  subjectColumns: string[];
  unknownColumns: string[];
  totalDataRows: number;
  toCreate: number;
  toUpdate: number;
  skipped: number;
  errors: number;
  parseWarnings: string[];
  rows: ExamResultImportRowPreview[];
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, ' ');
}

function matchMetaColumn(header: string, aliases: string[]): boolean {
  const n = normalizeHeader(header);
  return aliases.some((a) => n === a || n.includes(a));
}

const AESTHETIC_COLUMN_ALIASES = ['aesthetic studies', 'aesthetic study', 'aesthetics'];
const AESTHETIC_CHOICE_ALIASES = ['aesthetic subject', 'aesthetic choice', 'aesthetic option'];

const BUCKET_COLUMN_ALIASES = [
  'bucket subject i',
  'bucket subject 1',
  'bucket subject',
  'social sciences & commerce',
];
const BUCKET_CHOICE_ALIASES = [
  'bucket subject choice',
  'bucket subject option',
  'bucket elective',
];
const BUCKET_III_COLUMN_ALIASES = [
  'bucket subject iii',
  'bucket subject 3',
  'vocational / technical subjects',
  'vocational subjects',
  'technical subjects',
];
const BUCKET_III_CHOICE_ALIASES = [
  'bucket iii subject',
  'bucket subject iii choice',
  'bucket subject iii option',
  'vocational subject',
  'technical subject',
];

function isSelectOneChoiceColumn(
  header: string,
  grade: string,
  group: ExamSubjectGroup,
): boolean {
  const n = normalizeHeader(header);
  const choiceCol = getSelectOneChoiceColumnForGroup(group.title);
  if (choiceCol && normalizeHeader(choiceCol) === n) return true;
  if (group.title === AESTHETIC_STUDIES_LABEL) {
    return AESTHETIC_CHOICE_ALIASES.some((a) => n === a || n.includes(a));
  }
  if (group.title === BUCKET_SUBJECT_I_LABEL) {
    return BUCKET_CHOICE_ALIASES.some((a) => n === a || n.includes(a));
  }
  if (group.title === BUCKET_SUBJECT_III_LABEL) {
    return BUCKET_III_CHOICE_ALIASES.some((a) => n === a || n.includes(a));
  }
  return false;
}

function isSelectOneMarkColumn(
  header: string,
  grade: string,
  group: ExamSubjectGroup,
): boolean {
  if (isSelectOneChoiceColumn(header, grade, group)) return false;
  const n = normalizeHeader(header);
  if (normalizeHeader(group.title) === n) return true;
  if (group.title === AESTHETIC_STUDIES_LABEL) {
    return AESTHETIC_COLUMN_ALIASES.some((a) => n === a || n.includes(a));
  }
  if (group.title === BUCKET_SUBJECT_I_LABEL) {
    return BUCKET_COLUMN_ALIASES.some((a) => n === a || n.includes(a));
  }
  if (group.title === BUCKET_SUBJECT_III_LABEL) {
    return BUCKET_III_COLUMN_ALIASES.some((a) => n === a || n.includes(a));
  }
  return false;
}

/** Static sample files in /public/samples (by grade band). */
export const EXAM_RESULTS_SAMPLE_GRADES_6_9_URL = '/samples/exam-results-import-grades-6-9-sample.csv';
export const EXAM_RESULTS_SAMPLE_GRADES_10_11_URL =
  '/samples/exam-results-import-grades-10-11-sample.csv';
export const EXAM_RESULTS_SAMPLE_GRADES_12_13_ARTS_URL =
  '/samples/exam-results-import-grades-12-13-arts-sample.csv';

export function getExamResultsImportSampleUrl(grade: string, section?: string): string {
  if (isGrade10to11(grade)) return EXAM_RESULTS_SAMPLE_GRADES_10_11_URL;
  if (isGrade6to9(grade)) return EXAM_RESULTS_SAMPLE_GRADES_6_9_URL;
  if (isGrade12to13(grade) && resolveALStreamSubjectKey(section) === 'arts') {
    return EXAM_RESULTS_SAMPLE_GRADES_12_13_ARTS_URL;
  }
  return EXAM_RESULTS_SAMPLE_GRADES_6_9_URL;
}

export function getExamResultsImportSampleFileName(grade: string, section?: string): string {
  if (isGrade10to11(grade)) return 'exam-results-import-grades-10-11-sample.csv';
  if (isGrade12to13(grade) && resolveALStreamSubjectKey(section) === 'arts') {
    return 'exam-results-import-grades-12-13-arts-sample.csv';
  }
  return 'exam-results-import-grades-6-9-sample.csv';
}

/** Short help text for the import dialog. */
export function getExamResultsCsvFormatHelp(grade: string, section?: string): string {
  if (isGrade6to9(grade)) {
    return (
      'Columns: Admission Number, then fixed core subjects (marks out of 100), ' +
      'then Aesthetic Subject (choice) and Aesthetic Studies (mark). Use AB for absent. Rank is calculated after import.'
    );
  }
  if (isGrade10to11(grade)) {
    return (
      'Columns: Admission Number, then 6 fixed core subjects, then for each elective ' +
      'pair — Bucket Subject + Bucket Subject I, Aesthetic Subject + Aesthetic Studies, ' +
      'Bucket III Subject + Bucket Subject III (choice column then mark column). Use AB for absent.'
    );
  }
  if (isGrade12to13(grade)) {
    const pool = getSubjectsForExamination(grade, section);
    const streamHint = section ? ` (${section})` : '';
    return (
      `Columns: Admission Number, then subject columns${streamHint}: ${pool.join(', ')}. ` +
      `Science: enter marks for exactly ${AL_SUBJECT_COUNT} subjects per student (Maths or Bio track); use AB for absent; leave other columns blank.`
    );
  }
  return 'Columns: Admission Number, then one column per subject (marks out of 100, or AB for absent).';
}

function resolveSubjectColumn(
  header: string,
  grade: string,
  coreSubjects: string[],
  allSubjects: string[],
  section?: string,
): string | null {
  if (isGrade12to13(grade)) {
    const streamKey = resolveALStreamSubjectKey(section);
    return normalizeALSubject(header, streamKey);
  }

  for (const group of getSelectOneGroupsForGrade(grade)) {
    if (isSelectOneMarkColumn(header, grade, group)) return group.title;
  }

  const fixedSubjects =
    getSelectOneGroupsForGrade(grade).length > 0 ? coreSubjects : allSubjects;
  const n = normalizeHeader(header);
  for (const subject of fixedSubjects) {
    if (normalizeHeader(subject) === n) return subject;
  }
  const fromAliases = findSubjectInList(header, fixedSubjects);
  if (fromAliases) return fromAliases;
  for (const subject of fixedSubjects) {
    const sn = normalizeHeader(subject);
    if (n.includes(sn) || sn.includes(n)) return subject;
  }
  const legacyBucket = normalizeBucketSubjectI(header);
  if (legacyBucket) return legacyBucket;
  const legacyBucketIII = normalizeBucketSubjectIII(header);
  if (legacyBucketIII && isGrade10to11(grade)) return legacyBucketIII;
  const legacyAesthetic = normalizeAestheticStudies10_11(header);
  if (legacyAesthetic && isGrade10to11(grade)) return legacyAesthetic;
  return null;
}

type ParsedMarkCell = { kind: 'absent' } | { kind: 'mark'; value: number };

function parseMarkCell(raw: string | undefined): ParsedMarkCell | null {
  if (raw === undefined || raw.trim() === '') return null;
  const token = raw.trim().toUpperCase();
  if (token === 'AB' || token === 'A/B' || token === 'ABSENT' || token === 'ABS') {
    return { kind: 'absent' };
  }
  const n = Number(raw.trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return { kind: 'mark', value: n };
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Column holding the student's chosen aesthetic subject (Grade 6–9). */
export const AESTHETIC_CHOICE_COLUMN = 'Aesthetic Subject';

/** Column holding the student's Bucket Subject I choice (Grade 10–11). */
export const BUCKET_SUBJECT_CHOICE_COLUMN = 'Bucket Subject';

/** Column holding the student's Bucket Subject III choice (Grade 10–11). */
export const BUCKET_SUBJECT_III_CHOICE_COLUMN = 'Bucket III Subject';

/** Rank students by percentage (highest = 1). Ties share rank. */
export function computeRankByPercentage(
  entries: { studentId: string; percentage: number }[],
): Map<string, number> {
  return computeExamRanks(entries);
}

function resolveImportSubject(
  exam: Examination,
  student: Student,
  subjectName: string,
  row: string[],
  selectOneGroups: ExamSubjectGroup[],
  selectOneChoiceIdx: Map<string, number>,
  messages: string[],
): string | null {
  const selectOneGroup = selectOneGroups.find((g) => g.title === subjectName);
  let resolvedSubject = subjectName;
  if (isGrade12to13(exam.grade)) {
    const streamKey = resolveALStreamSubjectKey(exam.section);
    resolvedSubject = normalizeALSubject(subjectName, streamKey) ?? subjectName;
    if (/food\s*tech/i.test(resolvedSubject)) {
      resolvedSubject = normalizeALSubject('Agriculture', streamKey) ?? 'Agriculture';
    }
  } else {
    const curriculum = getSubjectsForExamination(exam.grade, exam.section);
    resolvedSubject =
      normalizeBucketSubjectI(subjectName) ??
      normalizeBucketSubjectIII(subjectName) ??
      normalizeAestheticStudies10_11(subjectName) ??
      resolveCanonicalSubjectName(subjectName, {
        grade: exam.grade,
        section: exam.section,
        candidates: curriculum,
      }) ??
      subjectName;
  }
  if (selectOneGroup) {
    const choiceColIdx = selectOneChoiceIdx.get(selectOneGroup.title);
    const choiceRaw = choiceColIdx !== undefined ? row[choiceColIdx] : undefined;
    const choice =
      normalizeSubjectForSelectOneGroup(exam.grade, selectOneGroup.title, choiceRaw) ||
      (selectOneGroup.title === AESTHETIC_STUDIES_LABEL && isGrade6to9(exam.grade)
        ? normalizeSubjectForSelectOneGroup(exam.grade, selectOneGroup.title, student.aestheticsSubject)
        : null);
    if (!choice) {
      const choiceCol =
        getSelectOneChoiceColumnForGroup(selectOneGroup.title) ?? `${selectOneGroup.title} choice`;
      messages.push(
        `Set the "${choiceCol}" column (${selectOneGroup.subjects.join(', ')})` +
          (selectOneGroup.title === AESTHETIC_STUDIES_LABEL && isGrade6to9(exam.grade)
            ? ' or student profile'
            : ''),
      );
      return null;
    }
    resolvedSubject = choice;
  }
  return resolvedSubject;
}

/** Build a blank import template CSV for the exam's grade (includes sample row). */
export function buildExamResultsCsvTemplate(grade: string, section?: string): string {
  const subjects = getExamResultCsvColumns(grade, section);
  const selectOneGroups = getSelectOneGroupsForGrade(grade);
  const headers: string[] = ['Admission Number'];
  const sampleCells: string[] = [];
  let alSampleCount = 0;
  subjects.forEach((col, i) => {
    const group = selectOneGroups.find((g) => g.title === col);
    const choiceColumn = group ? getSelectOneChoiceColumnForGroup(group.title) : null;
    if (group && choiceColumn) {
      headers.push(choiceColumn, group.title);
      sampleCells.push(group.subjects[0] ?? '', '80');
    } else {
      headers.push(col);
      if (isGrade12to13(grade)) {
        sampleCells.push(alSampleCount < AL_SUBJECT_COUNT ? String(75 + alSampleCount * 5) : '');
        alSampleCount += 1;
      } else {
        sampleCells.push(String(70 + (i % 25)));
      }
    }
  });
  const sampleRow = ['1234', ...sampleCells];
  return [headers, sampleRow].map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
}

export function downloadExamResultsCsvTemplate(exam: Pick<Examination, 'examName' | 'grade' | 'section'>): void {
  const csv = buildExamResultsCsvTemplate(exam.grade, exam.section);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = exam.examName.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase();
  a.href = url;
  a.download = `${safeName || 'exam'}-results-import.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function buildResultPayload(
  exam: Examination,
  student: Student,
  subjects: SubjectResult[],
  createdBy = ''
): Omit<ExamResult, 'id' | 'createdAt' | 'updatedAt'> {
  const totalMaxMarks = subjects.reduce((s, sub) => s + sub.maxMarks, 0);
  const totalObtainedMarks = subjects.reduce((s, sub) => s + sub.obtainedMarks, 0);
  const percentage = totalMaxMarks > 0 ? (totalObtainedMarks / totalMaxMarks) * 100 : 0;

  return {
    studentId: student.id,
    studentName: student.name,
    admissionNumber: student.admissionNumber,
    examinationId: exam.id,
    examName: exam.examName,
    grade: exam.grade,
    year: exam.year,
    term: exam.term,
    subjects,
    totalMaxMarks,
    totalObtainedMarks,
    percentage,
    createdBy,
  };
}

/** Assign ranks on import payloads using merged exam standings (CSV + existing results). */
function applyAutoRanksToImportRows(
  rows: ExamResultImportRowPreview[],
  existingResults: ExamResult[]
): void {
  const standings = new Map<string, number>();
  for (const r of existingResults) {
    standings.set(r.studentId, r.percentage);
  }
  for (const row of rows) {
    if (row.payload && (row.action === 'create' || row.action === 'update')) {
      standings.set(row.payload.studentId, row.payload.percentage);
    }
  }
  const rankMap = computeRankByPercentage(
    [...standings.entries()].map(([studentId, percentage]) => ({ studentId, percentage }))
  );
  for (const row of rows) {
    if (row.payload) {
      row.payload = { ...row.payload, rank: rankMap.get(row.payload.studentId) };
    }
  }
}

export function analyzeExamResultsCsv(
  text: string,
  fileName: string,
  exam: Examination,
  students: Student[],
  existingResults: ExamResult[],
  createdBy = ''
): ExamResultImportAnalysis {
  const coreSubjects = getCoreSubjectsForGrade(exam.grade);
  const allSubjects = getSubjectsForExamination(exam.grade, exam.section);
  const parseWarnings: string[] = [];
  const rows: ExamResultImportRowPreview[] = [];

  const grid = parseCsv(text);
  if (grid.length === 0) {
    return {
      fileName,
      grade: exam.grade,
      examName: exam.examName,
      subjectColumns: [],
      unknownColumns: [],
      totalDataRows: 0,
      toCreate: 0,
      toUpdate: 0,
      skipped: 0,
      errors: 0,
      parseWarnings: ['File is empty.'],
      rows: [],
    };
  }

  const headers = grid[0];
  let admissionIdx = -1;
  const selectOneChoiceIdx = new Map<string, number>();
  const selectOneGroups = getSelectOneGroupsForGrade(exam.grade);
  const subjectColumnMap = new Map<number, string>();
  const unknownColumns: string[] = [];

  headers.forEach((header, idx) => {
    if (matchMetaColumn(header, ADMISSION_ALIASES)) {
      admissionIdx = idx;
      return;
    }
    for (const group of selectOneGroups) {
      if (isSelectOneChoiceColumn(header, exam.grade, group)) {
        selectOneChoiceIdx.set(group.title, idx);
        return;
      }
    }
    const subject = resolveSubjectColumn(header, exam.grade, coreSubjects, allSubjects, exam.section);
    if (subject) {
      const duplicateIdx = [...subjectColumnMap.entries()].find(([, name]) => name === subject)?.[0];
      if (duplicateIdx !== undefined) {
        unknownColumns.push(header.trim());
        return;
      }
      subjectColumnMap.set(idx, subject);
    } else if (header.trim()) {
      unknownColumns.push(header.trim());
    }
  });

  if (admissionIdx === -1) {
    parseWarnings.push('Missing "Admission Number" column — add it as the first column.');
  }
  if (subjectColumnMap.size === 0) {
    parseWarnings.push(`No subject columns matched the ${exam.grade} curriculum. Download the sample CSV for correct headers.`);
  }
  if (selectOneGroups.length > 0) {
    for (const group of selectOneGroups) {
      const choiceCol = getSelectOneChoiceColumnForGroup(group.title);
      const markMapped = [...subjectColumnMap.values()].includes(group.title);
      if (markMapped && choiceCol && !selectOneChoiceIdx.has(group.title)) {
        parseWarnings.push(
          `Missing "${choiceCol}" column for ${group.title} — add it before the mark column.`
        );
      }
    }
  }
  if (unknownColumns.length > 0) {
    parseWarnings.push(`Unrecognized columns (ignored): ${unknownColumns.slice(0, 5).join(', ')}${unknownColumns.length > 5 ? '…' : ''}`);
  }

  const subjectColumns = [...subjectColumnMap.values()];
  const studentsByAdmission = new Map(
    students.map((s) => [s.admissionNumber.trim().toUpperCase(), s])
  );
  const existingByStudentId = new Map(existingResults.map((r) => [r.studentId, r]));
  const seenStudentIdsInFile = new Set<string>();

  for (let i = 1; i < grid.length; i++) {
    const row = grid[i];
    const rowNumber = i + 1;
    if (isRowEmpty(row)) continue;

    const admissionRaw = admissionIdx >= 0 ? row[admissionIdx]?.trim() : '';
    const messages: string[] = [];

    if (!admissionRaw) {
      rows.push({
        rowNumber,
        action: 'error',
        admissionNumber: '',
        studentName: '',
        subjectCount: 0,
        percentage: 0,
        messages: ['Missing admission number'],
      });
      continue;
    }

    const student = studentsByAdmission.get(admissionRaw.toUpperCase());
    if (student && seenStudentIdsInFile.has(student.id)) {
      rows.push({
        rowNumber,
        action: 'error',
        admissionNumber: admissionRaw,
        studentName: student.name,
        subjectCount: 0,
        percentage: 0,
        messages: ['Duplicate admission number in this file — keep one row per student'],
      });
      continue;
    }
    if (!student) {
      rows.push({
        rowNumber,
        action: 'error',
        admissionNumber: admissionRaw,
        studentName: '',
        subjectCount: 0,
        percentage: 0,
        messages: [`No active ${exam.grade} student with admission number "${admissionRaw}"`],
      });
      continue;
    }

    const subjectResults: SubjectResult[] = [];
    for (const [colIdx, subjectName] of subjectColumnMap) {
      const parsed = parseMarkCell(row[colIdx]);
      if (parsed === null) continue;
      const resolvedSubject = resolveImportSubject(
        exam,
        student,
        subjectName,
        row,
        selectOneGroups,
        selectOneChoiceIdx,
        messages,
      );
      if (!resolvedSubject) continue;

      if (parsed.kind === 'absent') {
        subjectResults.push({
          subject: resolvedSubject,
          maxMarks: DEFAULT_MAX_MARKS,
          obtainedMarks: 0,
          grade: 'AB',
          absent: true,
        });
        continue;
      }

      const mark = parsed.value;
      if (mark > DEFAULT_MAX_MARKS) {
        messages.push(`${subjectName}: mark ${mark} exceeds max ${DEFAULT_MAX_MARKS}`);
        continue;
      }

      subjectResults.push({
        subject: resolvedSubject,
        maxMarks: DEFAULT_MAX_MARKS,
        obtainedMarks: mark,
        grade: calcSubjectGrade(mark, DEFAULT_MAX_MARKS),
      });
    }

    if (subjectResults.length === 0) {
      rows.push({
        rowNumber,
        action: 'error',
        admissionNumber: admissionRaw,
        studentName: student.name,
        subjectCount: 0,
        percentage: 0,
        messages: ['No valid subject marks in row'],
      });
      continue;
    }

    const expectedSubjects = countCurriculumSubjects(exam.grade, exam.section);
    if (!isGrade12to13(exam.grade) && subjectResults.length !== expectedSubjects) {
      messages.push(
        `${exam.grade} students must have exactly ${expectedSubjects} subjects (found ${subjectResults.length})`,
      );
    }

    if (isGrade12to13(exam.grade)) {
      const pool = new Set(allSubjects);
      const streamKey = resolveALStreamSubjectKey(exam.section) as ALStreamSubjectKey | null;
      const subjectNames = subjectResults.map((sr) => sr.subject);
      if (subjectResults.length !== AL_SUBJECT_COUNT) {
        messages.push(
          `A/L students must have exactly ${AL_SUBJECT_COUNT} subjects (found ${subjectResults.length})`,
        );
      }
      for (const sr of subjectResults) {
        if (/food\s*tech/i.test(sr.subject)) {
          messages.push(
            `"${sr.subject}" is a Grade 10–11 subject name — use "Agriculture" for Grade 12–13 Science`,
          );
          continue;
        }
        if (!pool.has(sr.subject)) {
          messages.push(`"${sr.subject}" is not in this stream's subject pool`);
        }
      }
      if (
        streamKey === 'science' &&
        subjectNames.length === AL_SUBJECT_COUNT &&
        !isValidScienceALSubjectSet(subjectNames)
      ) {
        messages.push(
          'Science results must be all Maths track (Combined Maths, Physics, Chemistry, ICT) or all Bio track (Biology, Chemistry, Physics, Agriculture)',
        );
      }
    }

    if (messages.length > 0) {
      rows.push({
        rowNumber,
        action: 'error',
        admissionNumber: admissionRaw,
        studentName: student.name,
        subjectCount: subjectResults.length,
        percentage: 0,
        messages,
      });
      continue;
    }

    const payload = buildResultPayload(exam, student, subjectResults, createdBy);

    const existing = existingByStudentId.get(student.id);
    const action = existing ? 'update' : 'create';
    rows.push({
      rowNumber,
      action,
      admissionNumber: student.admissionNumber,
      studentName: student.name,
      subjectCount: subjectResults.length,
      percentage: payload.percentage,
      messages,
      existingResultId: existing?.id,
      payload,
    });
    seenStudentIdsInFile.add(student.id);
    if (action === 'create') {
      existingByStudentId.set(student.id, {
        id: '__pending__',
        studentId: student.id,
        examinationId: exam.id,
      } as ExamResult);
    } else if (existing && payload) {
      existingByStudentId.set(student.id, { ...existing, ...payload, id: existing.id });
    }
  }

  applyAutoRanksToImportRows(rows, existingResults);

  return {
    fileName,
    grade: exam.grade,
    examName: exam.examName,
    subjectColumns,
    unknownColumns,
    totalDataRows: rows.length,
    toCreate: rows.filter((r) => r.action === 'create').length,
    toUpdate: rows.filter((r) => r.action === 'update').length,
    skipped: rows.filter((r) => r.action === 'skip').length,
    errors: rows.filter((r) => r.action === 'error').length,
    parseWarnings,
    rows,
  };
}
