import { describe, expect, it } from 'vitest';
import {
  canManageStudents,
  canViewStudentRecord,
  hasUnrestrictedStudentAccess,
  isTeacher,
  resolveTeacherAllowedGrades,
} from './access-control';
import type { Staff, Student, UserProfile } from '@/types';

const principal: UserProfile = {
  uid: 'p1',
  email: 'p@test.lk',
  displayName: 'Principal',
  role: 'principal',
  accountType: 'staff',
  staffRole: 'principal',
};

const teacher: UserProfile = {
  uid: 't1',
  email: 't@test.lk',
  displayName: 'Teacher',
  role: 'teacher',
  accountType: 'staff',
  staffRole: 'teacher',
  allowedStudentGrades: ['Grade 6'],
};

const parent: UserProfile = {
  uid: 'par1',
  email: 'parent@test.lk',
  displayName: 'Parent',
  role: 'parent',
  accountType: 'parent',
  linkedId: 'ADM001',
};

const studentRow: Pick<Student, 'admissionNumber' | 'grade'> = {
  admissionNumber: 'ADM001',
  grade: 'Grade 6',
};

describe('access-control', () => {
  it('grants unrestricted student access to principal', () => {
    expect(hasUnrestrictedStudentAccess(principal)).toBe(true);
    expect(isTeacher(principal)).toBe(false);
    expect(canManageStudents(principal)).toBe(true);
  });

  it('scopes teachers to allowed grades', () => {
    expect(isTeacher(teacher)).toBe(true);
    expect(hasUnrestrictedStudentAccess(teacher)).toBe(false);
    expect(canManageStudents(teacher)).toBe(false);
    expect(resolveTeacherAllowedGrades(teacher)).toEqual(['Grade 6']);
    expect(canViewStudentRecord(teacher, studentRow)).toBe(true);
    expect(canViewStudentRecord(teacher, { ...studentRow, grade: 'Grade 10' })).toBe(false);
  });

  it('lets parents view only their linked child', () => {
    expect(canViewStudentRecord(parent, studentRow)).toBe(true);
    expect(canViewStudentRecord(parent, { ...studentRow, admissionNumber: 'ADM999' })).toBe(false);
  });

  it('reads grades from linked staff when profile has none', () => {
    const linkedStaff: Pick<Staff, 'gradesTaught'> = { gradesTaught: 'Grade 7, Grade 8' };
    expect(resolveTeacherAllowedGrades(teacher, linkedStaff)).toEqual(['Grade 6']);
    const bareTeacher = { ...teacher, allowedStudentGrades: undefined };
    expect(resolveTeacherAllowedGrades(bareTeacher, linkedStaff)).toEqual(['Grade 7', 'Grade 8']);
  });
});
