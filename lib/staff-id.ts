/**
 * Staff ID format: {classPrefix}{birthYear}{genderLetter}{phoneSuffix}
 * Example: SLPS-I, 1967, male, 0776987325 → SLP1967M325
 */

export type StaffIdInput = {
  classAndGrade?: string;
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
};

/** First 3 letters of the class portion (text before grade suffix like -I or -(B)). */
export function classGradeToStaffIdPrefix(classAndGrade: string): string {
  const raw = (classAndGrade || '').trim().toUpperCase();
  if (!raw) return '';

  const classPart = raw.split(/[-(]/)[0].trim();
  const letters = classPart.replace(/[^A-Z]/g, '');
  if (letters.length >= 3) return letters.slice(0, 3);
  if (letters.length > 0) return letters.padEnd(3, 'X').slice(0, 3);
  return '';
}

export function birthYearFromDateOfBirth(dateOfBirth: string): string {
  if (!dateOfBirth?.trim()) return '';
  const d = new Date(dateOfBirth);
  if (Number.isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  if (year < 1900 || year > 2100) return '';
  return String(year);
}

export function genderToStaffIdLetter(gender: string): string {
  const g = (gender || '').trim().toLowerCase();
  if (g === 'male' || g === 'm') return 'M';
  if (g === 'female' || g === 'f') return 'F';
  if (g === 'other' || g === 'o') return 'O';
  return '';
}

/** Last 3 digits of telephone (non-digit characters stripped). */
export function phoneToStaffIdSuffix(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length < 3) return '';
  return digits.slice(-3);
}

/**
 * Build staff ID when all parts are present; otherwise null.
 */
export function generateStaffId(input: StaffIdInput): string | null {
  const prefix = classGradeToStaffIdPrefix(input.classAndGrade || '');
  const year = birthYearFromDateOfBirth(input.dateOfBirth || '');
  const genderLetter = genderToStaffIdLetter(input.gender || '');
  const phoneSuffix = phoneToStaffIdSuffix(input.phone || '');

  if (prefix.length !== 3 || year.length !== 4 || !genderLetter || phoneSuffix.length !== 3) {
    return null;
  }

  return `${prefix}${year}${genderLetter}${phoneSuffix}`;
}

export function describeStaffIdFormat(): string {
  return 'Class (3 letters) + birth year + gender (M/F/O) + last 3 digits of phone';
}
