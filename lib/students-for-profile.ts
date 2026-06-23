import {
  getStudents,
  getStudentsInGrades,
  searchStudents,
} from './firestore';
import {
  hasUnrestrictedStudentAccess,
  isTeacher,
  resolveTeacherAllowedGrades,
} from './access-control';
import type { Staff, Student, UserProfile } from '@/types';

export type StudentsForProfileOptions = {
  linkedStaff?: Staff | null;
};

/** Loads students with Firestore queries that match the signed-in user's rules. */
export async function getStudentsForProfile(
  profile: UserProfile | null | undefined,
  gradeFilter?: string,
  statusFilter?: string,
  options?: StudentsForProfileOptions,
): Promise<Student[]> {
  if (!profile || hasUnrestrictedStudentAccess(profile)) {
    return getStudents(gradeFilter, statusFilter);
  }
  if (isTeacher(profile)) {
    const grades = resolveTeacherAllowedGrades(
      profile,
      options?.linkedStaff ?? null,
    );
    if (!grades.length) return [];
    if (gradeFilter) {
      if (!grades.includes(gradeFilter)) return [];
      return getStudentsInGrades([gradeFilter], statusFilter);
    }
    return getStudentsInGrades(grades, statusFilter);
  }
  return [];
}

export async function searchStudentsForProfile(
  profile: UserProfile | null | undefined,
  term: string,
  options?: StudentsForProfileOptions,
): Promise<Student[]> {
  if (!profile || hasUnrestrictedStudentAccess(profile)) {
    return searchStudents(term);
  }
  if (isTeacher(profile)) {
    const grades = resolveTeacherAllowedGrades(
      profile,
      options?.linkedStaff ?? null,
    );
    return searchStudents(term, grades);
  }
  return [];
}
