import { Staff, StaffRole, Student, UserProfile } from '@/types';

export type LoginFilter = 'all' | 'with_login' | 'without_login' | 'temp';

export interface StaffWithLogin {
  staff: Staff;
  login: UserProfile | null;
}

export interface StudentWithLogins {
  student: Student;
  studentLogin: UserProfile | null;
  parentLogin: UserProfile | null;
}

function normId(value?: string | null): string {
  return (value ?? '').trim().toLowerCase();
}

export function matchStaffLogin(staff: Staff, logins: UserProfile[]): UserProfile | null {
  const id = normId(staff.staffId);
  if (!id) return null;
  return (
    logins.find((u) => u.accountType === 'staff' && normId(u.linkedId) === id) ??
    logins.find((u) => u.accountType === 'staff' && normId(u.email) === normId(staff.email)) ??
    null
  );
}

export function matchStudentLogin(student: Student, logins: UserProfile[]): UserProfile | null {
  const id = normId(student.admissionNumber);
  if (!id) return null;
  return (
    logins.find((u) => u.accountType === 'student' && normId(u.linkedId) === id) ?? null
  );
}

export function matchParentLogin(student: Student, logins: UserProfile[]): UserProfile | null {
  const id = normId(student.admissionNumber);
  if (!id) return null;
  return logins.find((u) => u.accountType === 'parent' && normId(u.linkedId) === id) ?? null;
}

export function mergeStaffWithLogins(staff: Staff[], logins: UserProfile[]): StaffWithLogin[] {
  const staffLogins = logins.filter((u) => u.accountType === 'staff');
  return staff.map((s) => ({ staff: s, login: matchStaffLogin(s, staffLogins) }));
}

export function mergeStudentsWithLogins(
  students: Student[],
  logins: UserProfile[],
): StudentWithLogins[] {
  const studentLogins = logins.filter((u) => u.accountType === 'student');
  const parentLogins = logins.filter((u) => u.accountType === 'parent');
  return students.map((s) => ({
    student: s,
    studentLogin: matchStudentLogin(s, studentLogins),
    parentLogin: matchParentLogin(s, parentLogins),
  }));
}

export function inferStaffRoleFromRecord(staff: Staff): StaffRole {
  const d = `${staff.designation} ${staff.staffClassification ?? ''}`.toLowerCase();
  if (d.includes('principal') && !d.includes('vice')) return 'principal';
  if (d.includes('technical') && d.includes('officer')) return 'technical_officer';
  if (d.includes('vice') && d.includes('principal')) return 'vice_principal';
  if (staff.staffType === 'non-academic' || d.includes('clerk')) return 'clerk';
  return 'teacher';
}

export function staffLoginPrefill(staff: Staff) {
  return {
    accountType: 'staff' as const,
    displayName: staff.name,
    email: staff.email || '',
    phone: staff.phone,
    linkedId: staff.staffId,
    staffRole: inferStaffRoleFromRecord(staff),
    staff,
  };
}

export function studentLoginPrefill(student: Student) {
  return {
    accountType: 'student' as const,
    displayName: student.name,
    email: student.email || '',
    phone: student.phone || student.whatsapp || '',
    linkedId: student.admissionNumber,
    student,
  };
}

export function parentLoginPrefill(student: Student) {
  return {
    accountType: 'parent' as const,
    displayName: student.parentName || `Parent of ${student.name}`,
    email: student.parentEmail || '',
    phone: student.parentPhone,
    linkedId: student.admissionNumber,
    student,
  };
}

export function filterByLoginStatus<T extends { login?: UserProfile | null; studentLogin?: UserProfile | null }>(
  rows: T[],
  filter: LoginFilter,
  loginKey: 'login' | 'studentLogin' = 'login',
): T[] {
  if (filter === 'all') return rows;
  if (filter === 'with_login') {
    return rows.filter((r) => {
      const login = loginKey === 'login' ? r.login : r.studentLogin;
      return !!login;
    });
  }
  if (filter === 'temp') {
    return rows.filter((r) => {
      const login = loginKey === 'login' ? r.login : r.studentLogin;
      return login?.mustChangePassword === true;
    });
  }
  return rows.filter((r) => {
    const login = loginKey === 'login' ? r.login : r.studentLogin;
    return !login;
  });
}
