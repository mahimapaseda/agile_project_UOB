import { GRADES, Student } from '@/types';
import { normalizeAestheticSubject } from './exam-subjects';
import { normalizeClassSection, isAdvancedLevelGrade } from './grade-class-options';
import { normalizeIdentityNumber } from './identity-numbers';
import { suggestNextStudentIndexNumber } from './student-index';

/** Normalized keys from Google Form export headers */
export type CsvFieldKey =
  | 'timestamp'
  | 'nameInitials'
  | 'fullName'
  | 'profileImage'
  | 'indexNumber'
  | 'nic'
  | 'dateOfBirth'
  | 'gender'
  | 'religion'
  | 'address'
  | 'phone'
  | 'whatsapp'
  | 'email'
  | 'grade'
  | 'classSection'
  | 'admissionDate'
  | 'previousSchools'
  | 'medium'
  | 'aesthetics'
  | 'alSubjects'
  | 'examYear'
  | 'parentName'
  | 'parentPhone'
  | 'parentNic'
  | 'parentOccupation'
  | 'siblings'
  | 'siblingGrades'
  | 'disabilities';

const HEADER_ALIASES: { key: CsvFieldKey; patterns: string[] }[] = [
  { key: 'timestamp', patterns: ['timestamp'] },
  { key: 'nameInitials', patterns: ['01.name with initials', 'name with initials'] },
  { key: 'fullName', patterns: ['02. full name', 'full name'] },
  { key: 'profileImage', patterns: ['profile image'] },
  { key: 'indexNumber', patterns: ['03. index number', 'index number'] },
  { key: 'nic', patterns: ['04.national identity card', 'national identity card', 'nic number'] },
  { key: 'dateOfBirth', patterns: ['05.date of birth', 'date of birth', 'dob'] },
  { key: 'gender', patterns: ['06.gender', 'gender'] },
  { key: 'religion', patterns: ['07.religion', 'religion'] },
  { key: 'address', patterns: ['08.address', 'address'] },
  { key: 'phone', patterns: ['09.telephone', 'telephone number', 'phone'] },
  { key: 'whatsapp', patterns: ['10.whatsapp', 'whatsapp'] },
  { key: 'email', patterns: ['11.email', 'email address', '^email$'] },
  { key: 'siblingGrades', patterns: ['23.grades in which', 'grades in which they are studying', 'sibling grades'] },
  { key: 'grade', patterns: ['12.grade', '^grade$'] },
  { key: 'classSection', patterns: ['13.class', '^class$'] },
  { key: 'admissionDate', patterns: ['14.date of admission', 'admission to school', 'admission date'] },
  { key: 'previousSchools', patterns: ['15.schools previously', 'previously attended'] },
  { key: 'medium', patterns: ['16.medium', 'medium of study'] },
  { key: 'alSubjects', patterns: ['a/l subjects', 'al subjects', 'subjects you are study'] },
  { key: 'aesthetics', patterns: ['17 aesthetics', 'aesthetics subject', 'aesthetics'] },
  { key: 'parentName', patterns: ['18.name of parent', '^name of parent/guardian', '^name of parent / guardian'] },
  { key: 'parentPhone', patterns: ['19. contact number of parent', '^contact number of parent/guardian', '^contact number of parent / guardian'] },
  { key: 'parentNic', patterns: ['20.nic number of parent', '^nic number of parent/guardian', '^nic number of parent / guardian'] },
  { key: 'parentOccupation', patterns: ['21.occupation of parent', '^occupation of parent/guardian', '^occupation of parent / guardian'] },
  { key: 'siblings', patterns: ['22.names of siblings', 'siblings'] },
  { key: 'disabilities', patterns: ['24. special disabilities', 'disabilities'] },
  { key: 'examYear', patterns: ['year to appear for the exam', 'exam year'] },
];

export interface ParsedCsvRow {
  rowNumber: number;
  raw: Record<string, string>;
  fields: Partial<Record<CsvFieldKey, string>>;
}

export interface StudentImportRowPreview {
  rowNumber: number;
  action: 'create' | 'update' | 'skip' | 'error';
  admissionNumber: string;
  name: string;
  grade: string;
  messages: string[];
  existingId?: string;
  payload?: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>;
}

export interface StudentImportAnalysis {
  fileName: string;
  headerCount: number;
  mappedColumns: Partial<Record<CsvFieldKey, string>>;
  unmappedHeaders: string[];
  totalDataRows: number;
  validRows: number;
  toCreate: number;
  toUpdate: number;
  skipped: number;
  errors: number;
  rows: StudentImportRowPreview[];
  parseWarnings: string[];
}

function normalizeHeader(header: string): string {
  return header
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function patternMatches(normalizedHeader: string, pattern: string): boolean {
  if (pattern.startsWith('^') && pattern.endsWith('$')) {
    return normalizedHeader === pattern.slice(1, -1);
  }
  if (pattern.startsWith('^')) {
    return normalizedHeader.startsWith(pattern.slice(1));
  }
  return normalizedHeader === pattern || normalizedHeader.includes(pattern);
}

function resolveFieldKey(header: string): CsvFieldKey | null {
  const n = normalizeHeader(header);
  for (const { key, patterns } of HEADER_ALIASES) {
    if (patterns.some((p) => patternMatches(n, p))) return key;
  }
  return null;
}

/** RFC 4180-style CSV parse (handles quoted multiline cells). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
      row.push(cell);
      cell = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
      if (ch === '\r') i++;
    } else if (ch !== '\r') {
      cell += ch;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some((c) => c.trim() !== '')) rows.push(row);
  }

  return rows;
}

export function mapCsvHeaders(headers: string[]): {
  columnIndex: Partial<Record<CsvFieldKey, number>>;
  mappedColumns: Partial<Record<CsvFieldKey, string>>;
  unmappedHeaders: string[];
} {
  const columnIndex: Partial<Record<CsvFieldKey, number>> = {};
  const mappedColumns: Partial<Record<CsvFieldKey, string>> = {};
  const unmappedHeaders: string[] = [];

  headers.forEach((h, i) => {
    const key = resolveFieldKey(h);
    if (key) {
      // First matching column wins — avoids later parent/guardian columns overwriting name/phone.
      if (columnIndex[key] !== undefined) return;
      columnIndex[key] = i;
      mappedColumns[key] = h.trim();
    } else if (h.trim()) {
      unmappedHeaders.push(h.trim());
    }
  });

  return { columnIndex, mappedColumns, unmappedHeaders };
}

function rowToFields(
  cells: string[],
  columnIndex: Partial<Record<CsvFieldKey, number>>
): Partial<Record<CsvFieldKey, string>> {
  const fields: Partial<Record<CsvFieldKey, string>> = {};
  for (const key of Object.keys(columnIndex) as CsvFieldKey[]) {
    const idx = columnIndex[key];
    if (idx === undefined) continue;
    const val = (cells[idx] ?? '').trim();
    if (val) fields[key] = val;
  }
  return fields;
}

export function isRowEmpty(cells: string[]): boolean {
  return cells.every((c) => !c.trim());
}

export function parseDateToIso(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

  if (/^\d{4}$/.test(v)) return `${v}-01-01`;

  const yearWithNote = v.match(/(\d{4})\s*[\(/]/);
  if (yearWithNote) return `${yearWithNote[1]}-01-01`;

  const dotYear = v.match(/^(\d{4})\.(\d{1,2})(?:\.(\d{1,2}))?$/);
  if (dotYear) {
    const year = dotYear[1];
    const month = String(parseInt(dotYear[2], 10)).padStart(2, '0');
    const day = dotYear[3] ? String(parseInt(dotYear[3], 10)).padStart(2, '0') : '01';
    return `${year}-${month}-${day}`;
  }

  const ymdSlash = v.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymdSlash) {
    const year = ymdSlash[1];
    const month = String(parseInt(ymdSlash[2], 10)).padStart(2, '0');
    const day = String(parseInt(ymdSlash[3], 10)).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const slash = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (slash) {
    const a = parseInt(slash[1], 10);
    const b = parseInt(slash[2], 10);
    const year = parseInt(slash[3], 10);
    let day = a;
    let month = b;
    if (a <= 12 && b > 12) {
      month = a;
      day = b;
    }
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  const parsed = new Date(v);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return null;
}

export function normalizeGrade(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  const direct = GRADES.find((g) => g.toLowerCase() === v.toLowerCase());
  if (direct) return direct;
  const num = v.match(/^(\d{1,2})$/);
  if (num) {
    const g = `Grade ${num[1]}` as (typeof GRADES)[number];
    if (GRADES.includes(g)) return g;
  }
  const gradeWord = v.match(/grade\s*(\d{1,2})/i);
  if (gradeWord) {
    const g = `Grade ${gradeWord[1]}` as (typeof GRADES)[number];
    if (GRADES.includes(g)) return g;
  }
  return v.startsWith('Grade ') ? v : null;
}

export function normalizeGender(value: string): 'male' | 'female' | 'other' | null {
  const v = value.trim().toLowerCase();
  if (v === 'male' || v === 'm' || v === 'boy') return 'male';
  if (v === 'female' || v === 'f' || v === 'girl') return 'female';
  if (v) return 'other';
  return null;
}

function opt(value?: string): string | undefined {
  const v = value?.trim();
  return v || undefined;
}

const PENDING_IMPORT_ID = '__pending__';

function isPendingImportRecord(record: Student): boolean {
  return record.id === PENDING_IMPORT_ID;
}

function indexStudentForLookup(map: Map<string, Student>, student: Student): void {
  map.set(student.admissionNumber.toUpperCase(), student);
  const nic = normalizeIdentityNumber(student.nic);
  if (nic) map.set(`NIC:${nic}`, student);
}

function findExistingStudent(
  map: Map<string, Student>,
  payload: Pick<Student, 'admissionNumber' | 'nic'>,
): Student | undefined {
  const byAdmission = map.get(payload.admissionNumber.toUpperCase());
  if (byAdmission) return byAdmission;
  const nic = normalizeIdentityNumber(payload.nic);
  if (nic) return map.get(`NIC:${nic}`);
  return undefined;
}

export function buildStudentFromCsvFields(
  fields: Partial<Record<CsvFieldKey, string>>,
  rowNumber: number,
  fallbackAdmissionNumber?: string
): { payload?: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>; errors: string[] } {
  const errors: string[] = [];

  const fullName = fields.fullName?.trim();
  const initials = fields.nameInitials?.trim();
  const name = fullName || initials;
  if (!name || name.length < 2) errors.push('Missing student name (02. Full name or 01. Name with initials)');

  const indexRaw = normalizeIdentityNumber(fields.indexNumber);
  const admissionNumber = indexRaw
    ? indexRaw.replace(/\s+/g, '')
    : fallbackAdmissionNumber ?? suggestNextStudentIndexNumber([]);

  const dobRaw = fields.dateOfBirth;
  const dateOfBirth = dobRaw ? parseDateToIso(dobRaw) : null;
  if (dobRaw && !dateOfBirth) errors.push(`Invalid date of birth: ${dobRaw}`);

  const genderRaw = fields.gender;
  const gender = genderRaw ? normalizeGender(genderRaw) : null;
  if (genderRaw && !gender) errors.push(`Invalid gender: ${genderRaw}`);

  const address = fields.address?.trim();
  if (!address || address.length < 5) errors.push('Missing or short address (08.Address)');

  const parentName = fields.parentName?.trim();
  if (!parentName || parentName.length < 2) {
    errors.push('Missing parent/guardian name — check the “Name of parent/Guardian” column is mapped');
  }

  const parentPhone = fields.parentPhone?.replace(/\s+/g, '');
  if (!parentPhone || parentPhone.length < 9) {
    errors.push('Missing parent contact — check the “Contact number of parent/Guardian” column is mapped');
  }

  const gradeRaw = fields.grade;
  const grade = gradeRaw ? normalizeGrade(gradeRaw) : null;
  if (!gradeRaw) errors.push('Missing grade (12.Grade)');
  else if (!grade || !GRADES.includes(grade as (typeof GRADES)[number])) {
    errors.push(`Unrecognized grade: ${gradeRaw} (use Grade 1–13)`);
  }

  const admRaw = fields.admissionDate;
  const admissionDate = admRaw ? parseDateToIso(admRaw) : new Date().toISOString().split('T')[0];
  if (admRaw && !admissionDate) errors.push(`Invalid admission date: ${admRaw}`);

  const email = fields.email?.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push(`Invalid email: ${email}`);

  if (errors.length) return { errors };

  const alSubjectLine = opt(fields.alSubjects);
  const examYearLine = opt(fields.examYear);
  const aestheticsSubject = isAdvancedLevelGrade(grade!)
    ? alSubjectLine ?? normalizeAestheticSubject(fields.aesthetics) ?? opt(fields.aesthetics)
    : normalizeAestheticSubject(fields.aesthetics) ?? opt(fields.aesthetics);

  const payload: Omit<Student, 'id' | 'createdAt' | 'updatedAt'> = {
    admissionNumber,
    nameWithInitials: opt(initials),
    name: fullName || initials!,
    profileImageUrl: opt(fields.profileImage),
    nic: opt(normalizeIdentityNumber(fields.nic)),
    dateOfBirth: dateOfBirth || '2000-01-01',
    gender: gender || 'other',
    religion: opt(fields.religion),
    address: address!,
    phone: opt(fields.phone?.replace(/\s+/g, '')),
    whatsapp: opt(fields.whatsapp?.replace(/\s+/g, '')),
    email: email || undefined,
    grade: grade!,
    section: (() => {
      const raw = opt(fields.classSection);
      if (!raw || !grade) return raw;
      const normalized = normalizeClassSection(grade, raw);
      return normalized || raw;
    })(),
    admissionDate: admissionDate!,
    previousSchools: opt(fields.previousSchools),
    mediumOfStudy: opt(fields.medium),
    aestheticsSubject,
    parentName: parentName!,
    parentPhone: parentPhone!,
    parentNic: opt(normalizeIdentityNumber(fields.parentNic)),
    parentOccupation: opt(fields.parentOccupation),
    siblings: opt(fields.siblings),
    siblingGrades: opt(fields.siblingGrades),
    specialDisabilities: opt(fields.disabilities),
    notes: examYearLine ? `A/L exam year: ${examYearLine}` : undefined,
    status: 'active',
    nationality: 'Sri Lankan',
    formSubmittedAt: opt(fields.timestamp),
  };

  return { payload, errors: [] };
}

export function analyzeStudentCsv(
  csvText: string,
  fileName: string,
  existingStudents: Student[]
): StudentImportAnalysis {
  const parseWarnings: string[] = [];
  const table = parseCsv(csvText);

  if (table.length === 0) {
    return {
      fileName,
      headerCount: 0,
      mappedColumns: {},
      unmappedHeaders: [],
      totalDataRows: 0,
      validRows: 0,
      toCreate: 0,
      toUpdate: 0,
      skipped: 0,
      errors: 0,
      rows: [],
      parseWarnings: ['File is empty.'],
    };
  }

  const [headerRow, ...dataRows] = table;
  const { columnIndex, mappedColumns, unmappedHeaders } = mapCsvHeaders(headerRow);

  if (!columnIndex.fullName && !columnIndex.nameInitials) {
    parseWarnings.push('Could not find name column (02. Full name).');
  }
  if (!columnIndex.indexNumber) {
    parseWarnings.push('No index number column — numeric index numbers (1234, 1235, …) will be auto-assigned.');
  }

  const byAdmission = new Map<string, Student>();
  for (const s of existingStudents) {
    indexStudentForLookup(byAdmission, s);
  }

  const assignedNumbers = existingStudents.map((s) => s.admissionNumber);

  const rows: StudentImportRowPreview[] = [];
  let validRows = 0;
  let toCreate = 0;
  let toUpdate = 0;
  let skipped = 0;
  let errors = 0;

  dataRows.forEach((cells, i) => {
    if (isRowEmpty(cells)) {
      skipped++;
      return;
    }

    const rowNumber = i + 2;
    const fields = rowToFields(cells, columnIndex);
    const fallbackIndex = fields.indexNumber?.trim()
      ? undefined
      : suggestNextStudentIndexNumber(assignedNumbers);
    const { payload, errors: buildErrors } = buildStudentFromCsvFields(fields, rowNumber, fallbackIndex);

    if (buildErrors.length || !payload) {
      errors++;
      rows.push({
        rowNumber,
        action: 'error',
        admissionNumber: fields.indexNumber || '—',
        name: fields.fullName || fields.nameInitials || '—',
        grade: fields.grade || '—',
        messages: buildErrors,
      });
      return;
    }

    const existing = findExistingStudent(byAdmission, payload);

    if (existing && isPendingImportRecord(existing)) {
      errors++;
      rows.push({
        rowNumber,
        action: 'error',
        admissionNumber: payload.admissionNumber,
        name: payload.name,
        grade: payload.grade,
        messages: [
          'Duplicate student in this file (same index number or NIC) — keep one row per student',
        ],
      });
      return;
    }

    if (existing) {
      toUpdate++;
      validRows++;
      const matchedByNic =
        existing.admissionNumber.toUpperCase() !== payload.admissionNumber.toUpperCase();
      rows.push({
        rowNumber,
        action: 'update',
        admissionNumber: payload.admissionNumber,
        name: payload.name,
        grade: payload.grade,
        messages: [
          matchedByNic
            ? `Will update existing record matched by NIC (${existing.name}, #${existing.admissionNumber})`
            : `Will update existing record (${existing.name})`,
        ],
        existingId: existing.id,
        payload,
      });
    } else {
      toCreate++;
      validRows++;
      rows.push({
        rowNumber,
        action: 'create',
        admissionNumber: payload.admissionNumber,
        name: payload.name,
        grade: payload.grade,
        messages: ['New student will be created'],
        payload,
      });
      indexStudentForLookup(byAdmission, { id: PENDING_IMPORT_ID, ...payload } as Student);
      assignedNumbers.push(payload.admissionNumber);
    }
  });

  return {
    fileName,
    headerCount: headerRow.length,
    mappedColumns,
    unmappedHeaders,
    totalDataRows: dataRows.filter((r) => !isRowEmpty(r)).length,
    validRows,
    toCreate,
    toUpdate,
    skipped,
    errors,
    rows,
    parseWarnings,
  };
}
