import { getStaffByStaffId, getStudentByAdmissionNumber } from '@/lib/firestore';
import { Staff, Student, UserProfile } from '@/types';
import { getLinkedAdmissionNumber, isParentAccount, isSchoolStaff, isStudentAccount } from './access-control';

export function getLinkedStaffId(profile: UserProfile | null | undefined): string | null {
  if (!profile || profile.accountType !== 'staff') return null;
  const id = profile.linkedId?.trim();
  return id || null;
}

export function isOwnStaffRecord(
  profile: UserProfile | null | undefined,
  staff: Pick<Staff, 'staffId'>,
): boolean {
  const linked = getLinkedStaffId(profile);
  if (!linked) return false;
  return linked.toUpperCase() === staff.staffId.trim().toUpperCase();
}

export function isOwnStudentRecord(
  profile: UserProfile | null | undefined,
  student: Pick<Student, 'admissionNumber'>,
): boolean {
  const linked = getLinkedAdmissionNumber(profile);
  if (!linked) return false;
  return linked.toUpperCase() === student.admissionNumber.trim().toUpperCase();
}

export async function getLinkedStaffForProfile(
  profile: UserProfile,
): Promise<Staff | null> {
  const staffId = getLinkedStaffId(profile);
  if (!staffId) return null;
  return getStaffByStaffId(staffId);
}

export async function getLinkedStudentForProfile(
  profile: UserProfile,
): Promise<Student | null> {
  const admission = getLinkedAdmissionNumber(profile);
  if (!admission) return null;
  return getStudentByAdmissionNumber(admission);
}

/** Dashboard path to the user's school record profile, if linked. */
export async function resolveMyProfilePath(profile: UserProfile): Promise<string | null> {
  if (isSchoolStaff(profile)) {
    const staff = await getLinkedStaffForProfile(profile);
    return staff ? `/dashboard/staff/${staff.id}` : null;
  }
  if (isStudentAccount(profile) || isParentAccount(profile)) {
    const student = await getLinkedStudentForProfile(profile);
    return student ? `/dashboard/students/${student.id}` : null;
  }
  return null;
}
