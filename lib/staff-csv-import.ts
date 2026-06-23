import { Staff, SUBJECTS } from '@/types';
import { generateStaffId } from './staff-id';
import { generateId } from './utils';
import { normalizeIdentityNumber } from './identity-numbers';
import { parseCsv, parseDateToIso, normalizeGender, isRowEmpty } from './student-csv-import';

const PENDING_IMPORT_ID = '__pending__';

/** Normalized keys from Staff Google Form export headers */
export type StaffCsvFieldKey =
  | 'timestamp'
  | 'formEmail'
  | 'profileImage'
  | 'nameInitials'
  | 'fullName'
  | 'nic'
  | 'registrationNumber'
  | 'classAndGrade'
  | 'dateOfBirth'
  | 'gender'
  | 'maritalStatus'
  | 'spouseName'
  | 'spouseAddress'
  | 'spousePhone'
  | 'firstAppointment'
  | 'schoolAppointment'
  | 'previousSchools'
  | 'educationalQualifications'
  | 'professionalQualifications'
  | 'appointedSubject'
  | 'subjectsTaught'
  | 'gradesTaught'
  | 'teacherNumber'
  | 'phone'
  | 'whatsapp'
  | 'workEmail'
  | 'staffClassification'
  | 'address'
  | 'emergencyName'
  | 'emergencyPhone';

const STAFF_HEADER_ALIASES: { key: StaffCsvFieldKey; patterns: string[] }[] = [
  { key: 'timestamp', patterns: ['timestamp'] },
  { key: 'formEmail', patterns: ['email address'] },
  { key: 'profileImage', patterns: ['profile photo', 'upload your profile'] },
  { key: 'nameInitials', patterns: ['name with initials'] },
  { key: 'fullName', patterns: ['full name'] },
  { key: 'nic', patterns: ['national identity card', 'nic number'] },
  { key: 'registrationNumber', patterns: ['registration number'] },
  {
    key: 'classAndGrade',
    patterns: ['class and grade', 'class and grade (eg'],
  },
  { key: 'dateOfBirth', patterns: ['date of birth', 'dob'] },
  { key: 'gender', patterns: ['gender'] },
  { key: 'maritalStatus', patterns: ['marital status'] },
  { key: 'spouseName', patterns: ['spouse name'] },
  { key: 'spouseAddress', patterns: ['spouse address'] },
  { key: 'spousePhone', patterns: ['spouse telephone'] },
  { key: 'firstAppointment', patterns: ['date of first appointment', 'first appointment'] },
  {
    key: 'schoolAppointment',
    patterns: ['date of appointment to this school', 'appointment to this school'],
  },
  { key: 'previousSchools', patterns: ['previously served schools', 'previously served'] },
  { key: 'educationalQualifications', patterns: ['educational qualifications'] },
  { key: 'professionalQualifications', patterns: ['professional qualifications'] },
  { key: 'appointedSubject', patterns: ['appointed subject'] },
  { key: 'subjectsTaught', patterns: ['subjects taught'] },
  { key: 'gradesTaught', patterns: ['grades taught'] },
  {
    key: 'teacherNumber',
    patterns: ["this school's teacher", 'teachers number', "teacher's number"],
  },
  { key: 'phone', patterns: ['telephone number'] },
  { key: 'whatsapp', patterns: ['whatsapp'] },
  { key: 'workEmail', patterns: ['email address 2'] },
  { key: 'staffClassification', patterns: ['staff classification'] },
  { key: 'address', patterns: ['personal address'] },
  { key: 'emergencyName', patterns: ['emergency contact name'] },
  { key: 'emergencyPhone', patterns: ['emergency contact telephone'] },
];

function normalizeHeader(header: string): string {
  return header
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function resolveStaffFieldKey(header: string): StaffCsvFieldKey | null {
  const n = normalizeHeader(header);
  for (const { key, patterns } of STAFF_HEADER_ALIASES) {
    if (patterns.some((p) => n === p || n.includes(p))) {
      if (key === 'formEmail' && n.includes('email address 2')) continue;
      if (key === 'workEmail' && !n.includes('email address 2')) continue;
      if (key === 'gender' && n.includes('marital')) continue;
      return key;
    }
  }
  return null;
}

export function mapStaffCsvHeaders(headers: string[]): {
  columnIndex: Partial<Record<StaffCsvFieldKey, number>>;
  mappedColumns: Partial<Record<StaffCsvFieldKey, string>>;
  unmappedHeaders: string[];
} {
  const columnIndex: Partial<Record<StaffCsvFieldKey, number>> = {};
  const mappedColumns: Partial<Record<StaffCsvFieldKey, string>> = {};
  const unmappedHeaders: string[] = [];

  headers.forEach((h, i) => {
    const key = resolveStaffFieldKey(h);
    if (key) {
      if (columnIndex[key] === undefined) {
        columnIndex[key] = i;
        mappedColumns[key] = h.trim();
      }
    } else if (h.trim()) {
      unmappedHeaders.push(h.trim());
    }
  });

  return { columnIndex, mappedColumns, unmappedHeaders };
}

function staffRowToFields(
  cells: string[],
  columnIndex: Partial<Record<StaffCsvFieldKey, number>>
): Partial<Record<StaffCsvFieldKey, string>> {
  const fields: Partial<Record<StaffCsvFieldKey, string>> = {};
  for (const key of Object.keys(columnIndex) as StaffCsvFieldKey[]) {
    const idx = columnIndex[key];
    if (idx === undefined) continue;
    const val = (cells[idx] ?? '').trim();
    if (val) fields[key] = val;
  }
  return fields;
}

function opt(value?: string): string | undefined {
  const v = value?.trim();
  return v || undefined;
}

function isPlaceholderId(value: string): boolean {
  const v = value.trim().toLowerCase();
  return !v || v === '_' || v === '-' || v === 'n/a' || v === 'na';
}

export function resolveStaffIdFromFields(fields: Partial<Record<StaffCsvFieldKey, string>>): string {
  const dobIso = fields.dateOfBirth ? parseDateToIso(fields.dateOfBirth) : null;
  const genderNorm = fields.gender ? normalizeGender(fields.gender) : null;

  const generated = generateStaffId({
    classAndGrade: fields.classAndGrade,
    dateOfBirth: dobIso || undefined,
    gender: genderNorm || undefined,
    phone: fields.phone,
  });
  if (generated) return generated;

  const reg = fields.registrationNumber?.trim();
  if (reg && !isPlaceholderId(reg)) {
    return reg.toUpperCase().replace(/\s+/g, '');
  }

  const teacherRaw = fields.teacherNumber?.trim();
  if (teacherRaw) {
    const num = teacherRaw.replace(/[^\d.]/g, '');
    if (num) {
      const n = Math.round(parseFloat(num));
      if (!Number.isNaN(n)) return `STF${String(n).padStart(6, '0')}`;
    }
  }

  return generateId('STF');
}

function inferStaffType(classification?: string, subjects?: string[]): 'academic' | 'non-academic' {
  const c = (classification || '').toLowerCase();
  if (/teacher|principal|vice|instructor|lecturer|academic/.test(c)) return 'academic';
  if (/clerk|peon|labour|driver|security|non-academic|non academic|support/.test(c)) return 'non-academic';
  if (subjects && subjects.length > 0) return 'academic';
  return 'academic';
}

function inferDesignation(classification?: string, staffType?: 'academic' | 'non-academic'): string {
  const c = (classification || '').trim();
  if (c) return c;
  return staffType === 'academic' ? 'Teacher' : 'Staff';
}

/** Match subject strings from the form to known SUBJECTS list */
export function parseStaffSubjects(
  subjectsTaught?: string,
  appointedSubject?: string
): string[] {
  const rawParts = [
    ...(subjectsTaught?.split(/[,;|/]+/) ?? []),
    ...(appointedSubject ? [appointedSubject] : []),
  ]
    .map((s) => s.trim())
    .filter(Boolean);

  const found = new Set<string>();
  for (const part of rawParts) {
    const lower = part.toLowerCase();
    const exact = SUBJECTS.find((s) => s.toLowerCase() === lower);
    if (exact) {
      found.add(exact);
      continue;
    }
    const partial = SUBJECTS.find(
      (s) => lower.includes(s.toLowerCase()) || s.toLowerCase().includes(lower)
    );
    if (partial) found.add(partial);
    else found.add(part);
  }
  return [...found];
}

export function buildStaffFromCsvFields(
  fields: Partial<Record<StaffCsvFieldKey, string>>
): { payload?: Omit<Staff, 'id' | 'createdAt' | 'updatedAt'>; errors: string[] } {
  const errors: string[] = [];

  const fullName = fields.fullName?.trim();
  const initials = fields.nameInitials?.trim();
  const name = fullName || initials;
  if (!name || name.length < 2) {
    errors.push('Missing staff name (Full name or Name with initials)');
  }

  const staffId = resolveStaffIdFromFields(fields);

  const dobRaw = fields.dateOfBirth;
  const dateOfBirth = dobRaw ? parseDateToIso(dobRaw) : null;
  if (dobRaw && !dateOfBirth) errors.push(`Invalid date of birth: ${dobRaw}`);

  const genderRaw = fields.gender;
  const gender = genderRaw ? normalizeGender(genderRaw) : null;
  if (genderRaw && !gender) errors.push(`Invalid gender: ${genderRaw}`);

  const address = fields.address?.trim();
  if (!address || address.length < 5) errors.push('Missing or short personal address');

  const phone = fields.phone?.replace(/\s+/g, '');
  if (!phone || phone.length < 9) errors.push('Missing telephone number');

  const workEmail = fields.workEmail?.trim();
  const formEmail = fields.formEmail?.trim();
  const email = workEmail || formEmail;
  if (!email) errors.push('Missing email (Email Address 2 or Email Address)');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push(`Invalid email: ${email}`);

  const nicRaw = normalizeIdentityNumber(fields.nic);
  const nic = nicRaw || 'PENDING';
  if (nicRaw && nicRaw.length < 9) errors.push('NIC looks too short');

  const schoolAppt = fields.schoolAppointment;
  const firstAppt = fields.firstAppointment;
  const joinedDate = schoolAppt
    ? parseDateToIso(schoolAppt)
    : firstAppt
      ? parseDateToIso(firstAppt)
      : new Date().toISOString().split('T')[0];
  if (schoolAppt && !joinedDate) errors.push(`Invalid school appointment date: ${schoolAppt}`);

  const firstAppointmentDate = firstAppt ? parseDateToIso(firstAppt) : undefined;
  if (firstAppt && !firstAppointmentDate) errors.push(`Invalid first appointment date: ${firstAppt}`);

  if (errors.length) return { errors };

  const subjects = parseStaffSubjects(fields.subjectsTaught, fields.appointedSubject);
  const staffClassification = opt(fields.staffClassification);
  const staffType = inferStaffType(staffClassification, subjects);
  const designation = inferDesignation(staffClassification, staffType);

  const edu = opt(fields.educationalQualifications);
  const prof = opt(fields.professionalQualifications);
  const qualification = [edu, prof].filter(Boolean).join(' · ') || undefined;

  const payload: Omit<Staff, 'id' | 'createdAt' | 'updatedAt'> = {
    staffId,
    nameWithInitials: opt(initials),
    name: fullName || initials!,
    profileImageUrl: opt(fields.profileImage),
    nic,
    registrationNumber: opt(fields.registrationNumber),
    classAndGrade: opt(fields.classAndGrade),
    dateOfBirth: dateOfBirth || '1980-01-01',
    gender: gender || 'other',
    maritalStatus: opt(fields.maritalStatus),
    spouseName: opt(fields.spouseName),
    spouseAddress: opt(fields.spouseAddress),
    spousePhone: opt(fields.spousePhone?.replace(/\s+/g, '')),
    firstAppointmentDate: firstAppointmentDate || undefined,
    joinedDate: joinedDate!,
    previousSchools: opt(fields.previousSchools),
    educationalQualifications: edu,
    professionalQualifications: prof,
    qualification,
    appointedSubject: opt(fields.appointedSubject),
    subjectsTaught: opt(fields.subjectsTaught),
    subjects: subjects.length ? subjects : undefined,
    gradesTaught: opt(fields.gradesTaught),
    teacherNumber: opt(fields.teacherNumber),
    address: address!,
    phone: phone!,
    whatsapp: opt(fields.whatsapp?.replace(/\s+/g, '')),
    email: email!,
    staffClassification,
    staffType,
    designation,
    department: opt(fields.classAndGrade) || opt(fields.appointedSubject),
    emergencyContactName: opt(fields.emergencyName),
    emergencyContactPhone: opt(fields.emergencyPhone?.replace(/\s+/g, '')),
    status: 'active',
    formSubmittedAt: opt(fields.timestamp),
  };

  return { payload, errors: [] };
}

export interface StaffImportRowPreview {
  rowNumber: number;
  action: 'create' | 'update' | 'skip' | 'error';
  staffId: string;
  name: string;
  designation: string;
  messages: string[];
  existingId?: string;
  payload?: Omit<Staff, 'id' | 'createdAt' | 'updatedAt'>;
}

export interface StaffImportAnalysis {
  fileName: string;
  headerCount: number;
  mappedColumns: Partial<Record<StaffCsvFieldKey, string>>;
  unmappedHeaders: string[];
  totalDataRows: number;
  validRows: number;
  toCreate: number;
  toUpdate: number;
  skipped: number;
  errors: number;
  rows: StaffImportRowPreview[];
  parseWarnings: string[];
}

function staffMatchKey(s: Staff): string {
  return s.staffId.toUpperCase();
}

function isPendingImportRecord(record: Staff): boolean {
  return record.id === PENDING_IMPORT_ID;
}

function indexStaffForLookup(map: Map<string, Staff>, staff: Staff): void {
  map.set(staffMatchKey(staff), staff);
  const reg = staff.registrationNumber?.trim();
  if (reg && !isPlaceholderId(reg)) {
    map.set(reg.toUpperCase().replace(/\s+/g, ''), staff);
  }
  if (staff.teacherNumber) {
    const tid = resolveStaffIdFromFields({ teacherNumber: staff.teacherNumber });
    map.set(tid, staff);
  }
  const nic = normalizeIdentityNumber(staff.nic);
  if (nic && nic !== 'PENDING') map.set(`NIC:${nic}`, staff);
}

function findExistingStaff(
  map: Map<string, Staff>,
  payload: Pick<Staff, 'staffId' | 'registrationNumber' | 'teacherNumber' | 'nic'>,
): Staff | undefined {
  const byStaffId = map.get(staffMatchKey({ staffId: payload.staffId } as Staff));
  if (byStaffId) return byStaffId;

  const reg = payload.registrationNumber?.trim();
  if (reg && !isPlaceholderId(reg)) {
    const byReg = map.get(reg.toUpperCase().replace(/\s+/g, ''));
    if (byReg) return byReg;
  }

  if (payload.teacherNumber) {
    const tid = resolveStaffIdFromFields({ teacherNumber: payload.teacherNumber });
    const byTeacher = map.get(tid);
    if (byTeacher) return byTeacher;
  }

  const nic = normalizeIdentityNumber(payload.nic);
  if (nic && nic !== 'PENDING') return map.get(`NIC:${nic}`);

  return undefined;
}

export function analyzeStaffCsv(
  csvText: string,
  fileName: string,
  existingStaff: Staff[]
): StaffImportAnalysis {
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
  const { columnIndex, mappedColumns, unmappedHeaders } = mapStaffCsvHeaders(headerRow);

  if (!columnIndex.fullName && !columnIndex.nameInitials) {
    parseWarnings.push('Could not find name column (Full name).');
  }
  if (!columnIndex.phone) {
    parseWarnings.push('No telephone column — rows may fail validation.');
  }

  const byStaffId = new Map<string, Staff>();
  for (const s of existingStaff) {
    indexStaffForLookup(byStaffId, s);
  }

  const rows: StaffImportRowPreview[] = [];
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
    const fields = staffRowToFields(cells, columnIndex);
    const { payload, errors: buildErrors } = buildStaffFromCsvFields(fields);

    if (buildErrors.length || !payload) {
      errors++;
      rows.push({
        rowNumber,
        action: 'error',
        staffId: fields.registrationNumber || fields.teacherNumber || '—',
        name: fields.fullName || fields.nameInitials || '—',
        designation: fields.staffClassification || '—',
        messages: buildErrors,
      });
      return;
    }

    const existing = findExistingStaff(byStaffId, payload);

    if (existing && isPendingImportRecord(existing)) {
      errors++;
      rows.push({
        rowNumber,
        action: 'error',
        staffId: payload.staffId,
        name: payload.name,
        designation: payload.designation,
        messages: [
          'Duplicate staff in this file (same staff ID, registration, teacher number, or NIC) — keep one row per person',
        ],
      });
      return;
    }

    if (existing) {
      toUpdate++;
      validRows++;
      const matchedByAltKey = staffMatchKey(existing) !== staffMatchKey({ staffId: payload.staffId } as Staff);
      rows.push({
        rowNumber,
        action: 'update',
        staffId: payload.staffId,
        name: payload.name,
        designation: payload.designation,
        messages: [
          matchedByAltKey
            ? `Will update existing record matched by ID/NIC (${existing.name}, ${existing.staffId})`
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
        staffId: payload.staffId,
        name: payload.name,
        designation: payload.designation,
        messages: ['New staff member will be created'],
        payload,
      });
      indexStaffForLookup(byStaffId, { id: PENDING_IMPORT_ID, ...payload } as Staff);
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
