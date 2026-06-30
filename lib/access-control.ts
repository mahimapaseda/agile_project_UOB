import { Staff, Student, UserProfile } from '@/types';
import { getStaffSubjectList } from './examination-information';
import { parseGradesTaught, studentInAllowedGrades } from './grades-taught';
import { normalizeSubjectList } from './subject-names';

/** Admission number this login is tied to (student or parent account). */
export function getLinkedAdmissionNumber(profile: UserProfile | null | undefined): string | null {
  if (!profile?.linkedId?.trim()) return null;
  return profile.linkedId.trim();
}

export function isSchoolStaff(profile: UserProfile | null | undefined): boolean {
  return profile?.accountType === 'staff';
}

export function isParentAccount(profile: UserProfile | null | undefined): boolean {
  return profile?.accountType === 'parent' || profile?.role === 'parent';
}

export function isStudentAccount(profile: UserProfile | null | undefined): boolean {
  return profile?.accountType === 'student' || profile?.role === 'student';
}

export function isRestrictedToOwnStudent(profile: UserProfile | null | undefined): boolean {
  return isParentAccount(profile) || isStudentAccount(profile);
}

export function isTeacher(profile: UserProfile | null | undefined): boolean {
  return profile?.accountType === 'staff' && profile.staffRole === 'teacher';
}

/** Principal, technical officer, vice principal, and clerk — full student directory. */
export function hasUnrestrictedStudentAccess(profile: UserProfile | null | undefined): boolean {
  if (!isSchoolStaff(profile) || isTeacher(profile)) return false;
  return true;
}

/** @deprecated Use hasUnrestrictedStudentAccess — kept for existing imports. */
export function canViewAllStudents(profile: UserProfile | null | undefined): boolean {
  return hasUnrestrictedStudentAccess(profile);
}

/** Staff who may open the Students module (includes grade-scoped teachers). */
export function canAccessStudentsModule(profile: UserProfile | null | undefined): boolean {
  return hasUnrestrictedStudentAccess(profile) || isTeacher(profile);
}

export function resolveTeacherAllowedGrades(
  profile: UserProfile | null | undefined,
  linkedStaff?: Pick<Staff, 'gradesTaught'> | null,
): string[] {
  if (!isTeacher(profile)) return [];
  if (profile?.allowedStudentGrades?.length) return profile.allowedStudentGrades;
  if (linkedStaff) return parseGradesTaught(linkedStaff.gradesTaught);
  return [];
}

export function resolveTeacherAllowedSubjects(
  profile: UserProfile | null | undefined,
  linkedStaff?: Pick<Staff, 'subjectsTaught' | 'subjects' | 'appointedSubject'> | null,
): string[] {
  if (!isTeacher(profile) || !linkedStaff) return [];
  return normalizeSubjectList(getStaffSubjectList(linkedStaff as Staff));
}

/** Parent → linked child; student → own record; teachers → grades taught only. */
export function canViewStudentRecord(
  profile: UserProfile | null | undefined,
  student: Pick<Student, 'admissionNumber' | 'grade'>,
  options?: { teacherGrades?: string[]; linkedStaff?: Pick<Staff, 'gradesTaught'> | null },
): boolean {
  if (!profile) return false;

  if (isRestrictedToOwnStudent(profile)) {
    const linked = getLinkedAdmissionNumber(profile);
    if (!linked) return false;
    return student.admissionNumber === linked;
  }

  if (hasUnrestrictedStudentAccess(profile)) return true;

  if (isTeacher(profile)) {
    const grades =
      options?.teacherGrades ??
      resolveTeacherAllowedGrades(profile, options?.linkedStaff ?? null);
    return studentInAllowedGrades(student, grades);
  }

  return false;
}

export function canViewStaffDirectory(profile: UserProfile | null | undefined): boolean {
  return isSchoolStaff(profile);
}

/** Teachers see a contact-only staff directory (name, class/grade, phone, email, etc.). */
export function canViewFullStaffProfile(profile: UserProfile | null | undefined): boolean {
  if (!isSchoolStaff(profile)) return false;
  return !isTeacher(profile);
}

/** Staff directory access, or own employment record when linked by staff ID. */
export function canViewStaffRecord(
  profile: UserProfile | null | undefined,
  staff: Pick<Staff, 'staffId'>,
): boolean {
  if (!profile) return false;
  if (canViewStaffDirectory(profile)) return true;
  const linked = profile.linkedId?.trim();
  if (!linked || profile.accountType !== 'staff') return false;
  return linked.toUpperCase() === staff.staffId.trim().toUpperCase();
}

export function canViewExaminationsPortal(profile: UserProfile | null | undefined): boolean {
  return isSchoolStaff(profile);
}

export function isVicePrincipal(profile: UserProfile | null | undefined): boolean {
  return profile?.staffRole === 'vice_principal' || profile?.role === 'vice_principal';
}

/** Vice principal — read-only access to students, staff, exams, and inventory. */
export function isViewOnlyStaff(profile: UserProfile | null | undefined): boolean {
  return isVicePrincipal(profile);
}

/** Create, edit, delete student records — not teachers (grade view-only) or vice principals. */
export function canManageStudents(profile: UserProfile | null | undefined): boolean {
  if (!hasUnrestrictedStudentAccess(profile) || isViewOnlyStaff(profile)) return false;
  return true;
}

export function canManageStaff(profile: UserProfile | null | undefined): boolean {
  if (!profile || isViewOnlyStaff(profile)) return false;
  return ['principal', 'technical_officer'].includes(profile.role);
}

/** Create/edit exams, add results, import CSV — not teachers or vice principals. */
export function canManageExams(profile: UserProfile | null | undefined): boolean {
  if (!isSchoolStaff(profile) || isTeacher(profile) || isViewOnlyStaff(profile)) return false;
  return true;
}

/** Teachers: view results and export only. */
export function canViewExamResults(profile: UserProfile | null | undefined): boolean {
  return canViewExaminationsPortal(profile);
}

/** Principal or Technical Officer — full user management & staff record control. */
export function isAdmin(profile: UserProfile | null | undefined): boolean {
  if (!profile || profile.accountType !== 'staff') return false;
  if (profile.staffRole === 'principal' || profile.staffRole === 'technical_officer') return true;
  return profile.role === 'principal' || profile.role === 'technical_officer';
}

/** Principal, Technical Officer, and Vice Principal — per-student exam analysis from the directory. */
export function canViewStudentExamAnalysis(profile: UserProfile | null | undefined): boolean {
  return isAdmin(profile) || isVicePrincipal(profile);
}

/** Principal, Technical Officer, and Vice Principal — examination information reports. */
export function canViewExaminationInformation(profile: UserProfile | null | undefined): boolean {
  if (!profile || profile.accountType !== 'staff') return false;
  const role = profile.staffRole ?? profile.role;
  return role === 'principal' || role === 'technical_officer' || role === 'vice_principal';
}

/** All school staff may view the inventory directory. */
export function canViewInventory(profile: UserProfile | null | undefined): boolean {
  return isSchoolStaff(profile);
}

/** Principal, technical officer, and clerk — manage inventory records (vice principal: view only). */
export function canManageInventory(profile: UserProfile | null | undefined): boolean {
  if (!hasUnrestrictedStudentAccess(profile) || isViewOnlyStaff(profile)) return false;
  return true;
}

/** All signed-in users may view timetables (students/parents see their class only in the UI). */
export function canViewTimetable(profile: UserProfile | null | undefined): boolean {
  return Boolean(profile);
}

/** Principal, technical officer, and clerk — create and edit class timetables. */
export function canManageTimetable(profile: UserProfile | null | undefined): boolean {
  if (!hasUnrestrictedStudentAccess(profile) || isViewOnlyStaff(profile)) return false;
  return true;
}
