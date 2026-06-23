import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { StaffRole, UserProfile, UserRole } from '@/types';

export const STAFF_USERS_COLLECTION = 'staff_users';
export const STUDENT_USERS_COLLECTION = 'student_users';
export const PARENTS_COLLECTION = 'parents';
export const LEGACY_USERS_COLLECTION = 'users';

export function staffRoleToUserRole(staffRole: StaffRole): UserRole {
  if (staffRole === 'principal') return 'principal';
  if (staffRole === 'technical_officer') return 'technical_officer';
  if (staffRole === 'vice_principal') return 'vice_principal';
  return 'staff';
}

export function userRoleToStaffRole(role: UserRole): StaffRole | null {
  if (role === 'principal') return 'principal';
  if (role === 'technical_officer') return 'technical_officer';
  if (role === 'vice_principal') return 'vice_principal';
  if (role === 'staff') return 'teacher';
  return null;
}

export function getAccountCollection(accountType: UserProfile['accountType']): string {
  if (accountType === 'staff') return STAFF_USERS_COLLECTION;
  if (accountType === 'student') return STUDENT_USERS_COLLECTION;
  return PARENTS_COLLECTION;
}

export function resolveAccountType(
  role: UserRole,
  staffRole?: StaffRole
): UserProfile['accountType'] {
  if (role === 'student') return 'student';
  if (role === 'parent') return 'parent';
  if (staffRole || ['principal', 'technical_officer', 'vice_principal', 'staff'].includes(role)) {
    return 'staff';
  }
  return 'staff';
}

function buildStaffProfile(uid: string, data: Record<string, unknown>): UserProfile {
  const staffRole = data.staffRole as StaffRole;
  return {
    uid,
    email: data.email as string,
    displayName: data.displayName as string,
    role: staffRoleToUserRole(staffRole),
    accountType: 'staff',
    staffRole,
    linkedId: data.linkedId as string | undefined,
    allowedStudentGrades: data.allowedStudentGrades as string[] | undefined,
    phone: data.phone as string | undefined,
    photoURL: data.photoURL as string | undefined,
    isActive: data.isActive as boolean,
    quickPinEnabled: data.quickPinEnabled as boolean | undefined,
    createdAt: data.createdAt as UserProfile['createdAt'],
    updatedAt: data.updatedAt as UserProfile['updatedAt'],
  };
}

function buildStudentProfile(uid: string, data: Record<string, unknown>): UserProfile {
  return {
    uid,
    email: data.email as string,
    displayName: data.displayName as string,
    role: 'student',
    accountType: 'student',
    linkedId: data.linkedId as string | undefined,
    phone: data.phone as string | undefined,
    photoURL: data.photoURL as string | undefined,
    isActive: data.isActive as boolean,
    quickPinEnabled: data.quickPinEnabled as boolean | undefined,
    mustChangePassword: data.mustChangePassword === true,
    createdAt: data.createdAt as UserProfile['createdAt'],
    updatedAt: data.updatedAt as UserProfile['updatedAt'],
  };
}

function buildParentProfile(uid: string, data: Record<string, unknown>): UserProfile {
  return {
    uid,
    email: data.email as string,
    displayName: data.displayName as string,
    role: 'parent',
    accountType: 'parent',
    linkedId: data.linkedId as string | undefined,
    phone: data.phone as string | undefined,
    photoURL: data.photoURL as string | undefined,
    isActive: data.isActive as boolean,
    quickPinEnabled: data.quickPinEnabled as boolean | undefined,
    createdAt: data.createdAt as UserProfile['createdAt'],
    updatedAt: data.updatedAt as UserProfile['updatedAt'],
  };
}

export async function fetchUserProfileByUid(uid: string): Promise<UserProfile | null> {
  const [staffSnap, studentSnap, parentSnap] = await Promise.all([
    getDoc(doc(db, STAFF_USERS_COLLECTION, uid)),
    getDoc(doc(db, STUDENT_USERS_COLLECTION, uid)),
    getDoc(doc(db, PARENTS_COLLECTION, uid)),
  ]);

  if (staffSnap.exists()) return buildStaffProfile(uid, staffSnap.data());
  if (studentSnap.exists()) return buildStudentProfile(uid, studentSnap.data());
  if (parentSnap.exists()) return buildParentProfile(uid, parentSnap.data());

  return null;
}

export async function saveUserProfile(
  uid: string,
  profile: Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt'> & { createdAt?: unknown; updatedAt?: unknown }
): Promise<void> {
  const collection = getAccountCollection(profile.accountType);
  const ref = doc(db, collection, uid);
  const existing = await getDoc(ref);

  if (profile.accountType === 'staff') {
    const staffRole = profile.staffRole ?? userRoleToStaffRole(profile.role) ?? 'teacher';
    const payload = {
      email: profile.email,
      displayName: profile.displayName,
      staffRole,
      linkedId: profile.linkedId ?? null,
      allowedStudentGrades: profile.allowedStudentGrades ?? null,
      phone: profile.phone ?? null,
      photoURL: profile.photoURL ?? null,
      isActive: profile.isActive,
      updatedAt: serverTimestamp(),
    };
    if (!existing.exists()) {
      await setDoc(ref, { ...payload, createdAt: serverTimestamp() });
    } else {
      await updateDoc(ref, payload);
    }
    return;
  }

  const payload = {
    email: profile.email,
    displayName: profile.displayName,
    linkedId: profile.linkedId ?? null,
    phone: profile.phone ?? null,
    photoURL: profile.photoURL ?? null,
    isActive: profile.isActive,
    updatedAt: serverTimestamp(),
  };

  if (!existing.exists()) {
    await setDoc(ref, { ...payload, createdAt: serverTimestamp() });
  } else {
    await updateDoc(ref, payload);
  }
}

export async function patchUserProfile(
  uid: string,
  accountType: UserProfile['accountType'],
  data: Partial<UserProfile>
): Promise<void> {
  const ref = doc(db, getAccountCollection(accountType), uid);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}
