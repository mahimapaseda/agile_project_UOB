import { Staff, Student } from '@/types';
import { STAFF_FIELD_LABELS } from '@/lib/staff-form-fields';
import { STUDENT_FIELD_LABELS } from '@/lib/student-form-fields';
import { normalizeIdentityNumber } from '@/lib/identity-numbers';
import { formatDate } from '@/lib/utils';

export type ExportColumn<T> = {
  key: string;
  label: string;
  getValue: (row: T) => string;
};

function cell(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return value.filter(Boolean).join('; ');
  return String(value).trim();
}

/** Column order for staff list PDF — single landscape page, curated for readability. */
export const STAFF_PDF_FIELD_ORDER = [
  'staffId',
  'name',
  'nameWithInitials',
  'designation',
  'staffType',
  'department',
  'status',
  'phone',
  'whatsapp',
  'joinedDate',
  'gender',
  'classAndGrade',
  'subjects',
  'gradesTaught',
  'appointedSubject',
  'registrationNumber',
  'teacherNumber',
  'maritalStatus',
] as const;

/** Compact headers for staff PDF tables (long form labels wrap poorly). */
export const STAFF_PDF_SHORT_LABELS: Record<(typeof STAFF_PDF_FIELD_ORDER)[number], string> = {
  staffId: 'Staff ID',
  name: 'Full name',
  nameWithInitials: 'Initials',
  designation: 'Designation',
  staffType: 'Type',
  department: 'Department',
  status: 'Status',
  phone: 'Phone',
  whatsapp: 'WhatsApp',
  joinedDate: 'Joined',
  gender: 'Gender',
  classAndGrade: 'Class',
  subjects: 'Subjects',
  gradesTaught: 'Grades',
  appointedSubject: 'Appointed',
  registrationNumber: 'Reg. no.',
  teacherNumber: 'Teacher no.',
  maritalStatus: 'Marital',
};

export function buildStaffPdfColumns(fields: ExportColumn<Staff>[]): ExportColumn<Staff>[] {
  const byKey = new Map(fields.map((f) => [f.key, f]));
  return STAFF_PDF_FIELD_ORDER.flatMap((key) => {
    const col = byKey.get(key);
    if (!col) return [];
    const shortLabel = STAFF_PDF_SHORT_LABELS[key];
    return [{ ...col, label: shortLabel ?? col.label }];
  });
}

export function orderStaffPdfColumns(columns: ExportColumn<Staff>[]): ExportColumn<Staff>[] {
  const order = new Map(STAFF_PDF_FIELD_ORDER.map((key, index) => [key, index]));
  return [...columns].sort((a, b) => {
    const left = order.get(a.key as (typeof STAFF_PDF_FIELD_ORDER)[number]) ?? 999;
    const right = order.get(b.key as (typeof STAFF_PDF_FIELD_ORDER)[number]) ?? 999;
    return left - right;
  });
}

/** Full Google Form order for staff CSV exports. */
export const STAFF_CSV_FIELD_ORDER = [
  'formSubmittedAt',
  'nameWithInitials',
  'name',
  'profileImageUrl',
  'nic',
  'registrationNumber',
  'classAndGrade',
  'dateOfBirth',
  'gender',
  'maritalStatus',
  'spouseName',
  'spouseAddress',
  'spousePhone',
  'firstAppointmentDate',
  'joinedDate',
  'previousSchools',
  'educationalQualifications',
  'professionalQualifications',
  'appointedSubject',
  'subjects',
  'gradesTaught',
  'teacherNumber',
  'address',
  'phone',
  'whatsapp',
  'email',
  'staffClassification',
  'staffId',
  'staffType',
  'designation',
  'department',
  'status',
  'emergencyContactName',
  'emergencyContactPhone',
  'notes',
] as const;

export function orderStaffCsvColumns(columns: ExportColumn<Staff>[]): ExportColumn<Staff>[] {
  const order = new Map(STAFF_CSV_FIELD_ORDER.map((key, index) => [key, index]));
  return [...columns].sort((a, b) => {
    const left = order.get(a.key as (typeof STAFF_CSV_FIELD_ORDER)[number]) ?? 999;
    const right = order.get(b.key as (typeof STAFF_CSV_FIELD_ORDER)[number]) ?? 999;
    return left - right;
  });
}

export const STAFF_EXPORT_FIELDS_FULL: ExportColumn<Staff>[] = [
  { key: 'staffId', label: STAFF_FIELD_LABELS.staffId, getValue: (s) => cell(s.staffId) },
  { key: 'name', label: STAFF_FIELD_LABELS.name, getValue: (s) => cell(s.name) },
  { key: 'nameWithInitials', label: STAFF_FIELD_LABELS.nameWithInitials, getValue: (s) => cell(s.nameWithInitials) },
  { key: 'profileImageUrl', label: STAFF_FIELD_LABELS.profileImageUrl, getValue: (s) => cell(s.profileImageUrl) },
  { key: 'nic', label: STAFF_FIELD_LABELS.nic, getValue: (s) => cell(normalizeIdentityNumber(s.nic) ?? '') },
  { key: 'registrationNumber', label: STAFF_FIELD_LABELS.registrationNumber, getValue: (s) => cell(s.registrationNumber) },
  { key: 'classAndGrade', label: STAFF_FIELD_LABELS.classAndGrade, getValue: (s) => cell(s.classAndGrade) },
  { key: 'dateOfBirth', label: STAFF_FIELD_LABELS.dateOfBirth, getValue: (s) => formatDate(s.dateOfBirth) },
  { key: 'gender', label: STAFF_FIELD_LABELS.gender, getValue: (s) => cell(s.gender) },
  { key: 'maritalStatus', label: STAFF_FIELD_LABELS.maritalStatus, getValue: (s) => cell(s.maritalStatus) },
  { key: 'spouseName', label: STAFF_FIELD_LABELS.spouseName, getValue: (s) => cell(s.spouseName) },
  { key: 'spouseAddress', label: STAFF_FIELD_LABELS.spouseAddress, getValue: (s) => cell(s.spouseAddress) },
  { key: 'spousePhone', label: STAFF_FIELD_LABELS.spousePhone, getValue: (s) => cell(s.spousePhone) },
  { key: 'firstAppointmentDate', label: STAFF_FIELD_LABELS.firstAppointmentDate, getValue: (s) => formatDate(s.firstAppointmentDate ?? '') },
  { key: 'joinedDate', label: STAFF_FIELD_LABELS.joinedDate, getValue: (s) => formatDate(s.joinedDate) },
  { key: 'previousSchools', label: STAFF_FIELD_LABELS.previousSchools, getValue: (s) => cell(s.previousSchools) },
  { key: 'educationalQualifications', label: STAFF_FIELD_LABELS.educationalQualifications, getValue: (s) => cell(s.educationalQualifications) },
  { key: 'professionalQualifications', label: STAFF_FIELD_LABELS.professionalQualifications, getValue: (s) => cell(s.professionalQualifications) },
  { key: 'appointedSubject', label: STAFF_FIELD_LABELS.appointedSubject, getValue: (s) => cell(s.appointedSubject) },
  { key: 'subjects', label: STAFF_FIELD_LABELS.subjectsTaught, getValue: (s) => cell(s.subjects ?? s.subjectsTaught) },
  { key: 'gradesTaught', label: STAFF_FIELD_LABELS.gradesTaught, getValue: (s) => cell(s.gradesTaught) },
  { key: 'teacherNumber', label: STAFF_FIELD_LABELS.teacherNumber, getValue: (s) => cell(s.teacherNumber) },
  { key: 'address', label: STAFF_FIELD_LABELS.address, getValue: (s) => cell(s.address) },
  { key: 'phone', label: STAFF_FIELD_LABELS.phone, getValue: (s) => cell(s.phone) },
  { key: 'whatsapp', label: STAFF_FIELD_LABELS.whatsapp, getValue: (s) => cell(s.whatsapp) },
  { key: 'email', label: STAFF_FIELD_LABELS.email, getValue: (s) => cell(s.email) },
  { key: 'staffClassification', label: STAFF_FIELD_LABELS.staffClassification, getValue: (s) => cell(s.staffClassification) },
  { key: 'designation', label: STAFF_FIELD_LABELS.designation, getValue: (s) => cell(s.designation) },
  { key: 'staffType', label: STAFF_FIELD_LABELS.staffType, getValue: (s) => cell(s.staffType) },
  { key: 'department', label: STAFF_FIELD_LABELS.department, getValue: (s) => cell(s.department) },
  { key: 'status', label: STAFF_FIELD_LABELS.status, getValue: (s) => cell(s.status) },
  { key: 'emergencyContactName', label: STAFF_FIELD_LABELS.emergencyContactName, getValue: (s) => cell(s.emergencyContactName) },
  { key: 'emergencyContactPhone', label: STAFF_FIELD_LABELS.emergencyContactPhone, getValue: (s) => cell(s.emergencyContactPhone) },
  { key: 'formSubmittedAt', label: STAFF_FIELD_LABELS.formSubmittedAt, getValue: (s) => cell(s.formSubmittedAt) },
  { key: 'notes', label: STAFF_FIELD_LABELS.notes, getValue: (s) => cell(s.notes) },
];

const STAFF_PDF_ALLOWED = new Set<string>(STAFF_PDF_FIELD_ORDER);

/** Omitted from staff PDF picker (still available in CSV). */
export const STAFF_PDF_EXCLUDED_FIELD_KEYS = STAFF_EXPORT_FIELDS_FULL
  .map((f) => f.key)
  .filter((key) => !STAFF_PDF_ALLOWED.has(key));

export const STAFF_EXPORT_FIELDS_LIMITED: ExportColumn<Staff>[] = [
  { key: 'name', label: STAFF_FIELD_LABELS.name, getValue: (s) => cell(s.name) },
  { key: 'nameWithInitials', label: STAFF_FIELD_LABELS.nameWithInitials, getValue: (s) => cell(s.nameWithInitials) },
  { key: 'classAndGrade', label: STAFF_FIELD_LABELS.classAndGrade, getValue: (s) => cell(s.classAndGrade) },
  { key: 'phone', label: STAFF_FIELD_LABELS.phone, getValue: (s) => cell(s.phone) },
  { key: 'whatsapp', label: STAFF_FIELD_LABELS.whatsapp, getValue: (s) => cell(s.whatsapp) },
  { key: 'email', label: STAFF_FIELD_LABELS.email, getValue: (s) => cell(s.email) },
];

/** Omitted from student PDF exports (still available in CSV). */
export const STUDENT_PDF_EXCLUDED_FIELD_KEYS = [
  'email',
  'address',
  'parentEmail',
  'parentNic',
  'parentOccupation',
] as const;

/** Column order for student list PDF — parent contact & academic fields on the same page. */
export const STUDENT_PDF_FIELD_ORDER = [
  'admissionNumber',
  'name',
  'nameWithInitials',
  'grade',
  'section',
  'gender',
  'phone',
  'whatsapp',
  'dateOfBirth',
  'nic',
  'religion',
  'admissionDate',
  'status',
  'parentName',
  'parentPhone',
  'mediumOfStudy',
  'aestheticsSubject',
  'notes',
] as const;

export function orderStudentPdfColumns(columns: ExportColumn<Student>[]): ExportColumn<Student>[] {
  const order = new Map(STUDENT_PDF_FIELD_ORDER.map((key, index) => [key, index]));
  return [...columns].sort((a, b) => {
    const left = order.get(a.key as (typeof STUDENT_PDF_FIELD_ORDER)[number]) ?? 999;
    const right = order.get(b.key as (typeof STUDENT_PDF_FIELD_ORDER)[number]) ?? 999;
    return left - right;
  });
}

/** Full Google Form order for student CSV exports. */
export const STUDENT_CSV_FIELD_ORDER = [
  'formSubmittedAt',
  'nameWithInitials',
  'name',
  'profileImageUrl',
  'admissionNumber',
  'nic',
  'dateOfBirth',
  'gender',
  'religion',
  'address',
  'phone',
  'whatsapp',
  'email',
  'grade',
  'section',
  'admissionDate',
  'previousSchools',
  'mediumOfStudy',
  'aestheticsSubject',
  'parentName',
  'parentPhone',
  'parentNic',
  'parentOccupation',
  'parentEmail',
  'siblings',
  'siblingGrades',
  'specialDisabilities',
  'nationality',
  'bloodGroup',
  'status',
  'notes',
] as const;

export function orderStudentCsvColumns(columns: ExportColumn<Student>[]): ExportColumn<Student>[] {
  const order = new Map(STUDENT_CSV_FIELD_ORDER.map((key, index) => [key, index]));
  return [...columns].sort((a, b) => {
    const left = order.get(a.key as (typeof STUDENT_CSV_FIELD_ORDER)[number]) ?? 999;
    const right = order.get(b.key as (typeof STUDENT_CSV_FIELD_ORDER)[number]) ?? 999;
    return left - right;
  });
}

export const STUDENT_EXPORT_FIELDS: ExportColumn<Student>[] = [
  { key: 'admissionNumber', label: STUDENT_FIELD_LABELS.admissionNumber, getValue: (s) => cell(s.admissionNumber) },
  { key: 'name', label: STUDENT_FIELD_LABELS.name, getValue: (s) => cell(s.name) },
  { key: 'nameWithInitials', label: STUDENT_FIELD_LABELS.nameWithInitials, getValue: (s) => cell(s.nameWithInitials) },
  { key: 'grade', label: STUDENT_FIELD_LABELS.grade, getValue: (s) => cell(s.grade) },
  { key: 'section', label: STUDENT_FIELD_LABELS.section, getValue: (s) => cell(s.section) },
  { key: 'gender', label: STUDENT_FIELD_LABELS.gender, getValue: (s) => cell(s.gender) },
  { key: 'phone', label: STUDENT_FIELD_LABELS.phone, getValue: (s) => cell(s.phone) },
  { key: 'whatsapp', label: STUDENT_FIELD_LABELS.whatsapp, getValue: (s) => cell(s.whatsapp) },
  { key: 'email', label: STUDENT_FIELD_LABELS.email, getValue: (s) => cell(s.email) },
  { key: 'address', label: STUDENT_FIELD_LABELS.address, getValue: (s) => cell(s.address) },
  { key: 'dateOfBirth', label: STUDENT_FIELD_LABELS.dateOfBirth, getValue: (s) => formatDate(s.dateOfBirth) },
  { key: 'nic', label: STUDENT_FIELD_LABELS.nic, getValue: (s) => cell(normalizeIdentityNumber(s.nic) ?? '') },
  { key: 'religion', label: STUDENT_FIELD_LABELS.religion, getValue: (s) => cell(s.religion) },
  { key: 'admissionDate', label: STUDENT_FIELD_LABELS.admissionDate, getValue: (s) => formatDate(s.admissionDate) },
  { key: 'status', label: 'Status', getValue: (s) => cell(s.status) },
  { key: 'parentName', label: STUDENT_FIELD_LABELS.parentName, getValue: (s) => cell(s.parentName) },
  { key: 'parentPhone', label: STUDENT_FIELD_LABELS.parentPhone, getValue: (s) => cell(s.parentPhone) },
  { key: 'parentEmail', label: 'Parent email', getValue: (s) => cell(s.parentEmail) },
  {
    key: 'parentNic',
    label: STUDENT_FIELD_LABELS.parentNic,
    getValue: (s) => cell(normalizeIdentityNumber(s.parentNic) ?? ''),
  },
  { key: 'parentOccupation', label: STUDENT_FIELD_LABELS.parentOccupation, getValue: (s) => cell(s.parentOccupation) },
  { key: 'previousSchools', label: STUDENT_FIELD_LABELS.previousSchools, getValue: (s) => cell(s.previousSchools) },
  { key: 'mediumOfStudy', label: STUDENT_FIELD_LABELS.mediumOfStudy, getValue: (s) => cell(s.mediumOfStudy) },
  { key: 'aestheticsSubject', label: STUDENT_FIELD_LABELS.aestheticsSubject, getValue: (s) => cell(s.aestheticsSubject) },
  { key: 'siblings', label: STUDENT_FIELD_LABELS.siblings, getValue: (s) => cell(s.siblings) },
  { key: 'siblingGrades', label: STUDENT_FIELD_LABELS.siblingGrades, getValue: (s) => cell(s.siblingGrades) },
  { key: 'specialDisabilities', label: STUDENT_FIELD_LABELS.specialDisabilities, getValue: (s) => cell(s.specialDisabilities) },
  { key: 'nationality', label: 'Nationality', getValue: (s) => cell(s.nationality) },
  { key: 'bloodGroup', label: 'Blood group', getValue: (s) => cell(s.bloodGroup) },
  { key: 'profileImageUrl', label: STUDENT_FIELD_LABELS.profileImageUrl, getValue: (s) => cell(s.profileImageUrl) },
  { key: 'formSubmittedAt', label: STUDENT_FIELD_LABELS.formSubmittedAt, getValue: (s) => cell(s.formSubmittedAt) },
  { key: 'notes', label: 'Notes', getValue: (s) => cell(s.notes) },
];

export function pickExportColumns<T>(
  all: ExportColumn<T>[],
  selectedKeys: string[],
): ExportColumn<T>[] {
  const set = new Set(selectedKeys);
  return all.filter((col) => set.has(col.key));
}

export function excludeExportColumns<T>(
  columns: ExportColumn<T>[],
  excludedKeys: readonly string[],
): ExportColumn<T>[] {
  const excluded = new Set(excludedKeys);
  return columns.filter((col) => !excluded.has(col.key));
}
