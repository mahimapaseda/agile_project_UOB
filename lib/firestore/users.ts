import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import {
  fetchUserProfileByUid,
  patchUserProfile,
  saveUserProfile,
  staffRoleToUserRole,
  STAFF_USERS_COLLECTION,
  STUDENT_USERS_COLLECTION,
  PARENTS_COLLECTION,
} from '../user-profiles';
import type { StaffRole, UserProfile } from '@/types';

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  return fetchUserProfileByUid(uid);
}

export async function getUsers(): Promise<UserProfile[]> {
  const [staffSnap, studentSnap, parentSnap] = await Promise.all([
    getDocs(query(collection(db, STAFF_USERS_COLLECTION), orderBy('displayName'))),
    getDocs(query(collection(db, STUDENT_USERS_COLLECTION), orderBy('displayName'))),
    getDocs(query(collection(db, PARENTS_COLLECTION), orderBy('displayName'))),
  ]);

  const staffUsers: UserProfile[] = staffSnap.docs.map((d) => {
    const data = d.data();
    const staffRole = data.staffRole as StaffRole;
    return {
      uid: d.id,
      email: data.email,
      displayName: data.displayName,
      role: staffRoleToUserRole(staffRole),
      accountType: 'staff',
      staffRole,
      linkedId: data.linkedId,
      phone: data.phone,
      photoURL: data.photoURL,
      isActive: data.isActive,
      quickPinEnabled: data.quickPinEnabled,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    } as UserProfile;
  });

  const studentUsers: UserProfile[] = studentSnap.docs.map((d) => {
    const data = d.data();
    return {
      uid: d.id,
      email: data.email,
      displayName: data.displayName,
      role: 'student',
      accountType: 'student',
      linkedId: data.linkedId,
      phone: data.phone,
      photoURL: data.photoURL,
      isActive: data.isActive,
      quickPinEnabled: data.quickPinEnabled,
      mustChangePassword: data.mustChangePassword === true,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    } as UserProfile;
  });

  const parentUsers: UserProfile[] = parentSnap.docs.map((d) => {
    const data = d.data();
    return {
      uid: d.id,
      email: data.email,
      displayName: data.displayName,
      role: 'parent',
      accountType: 'parent',
      linkedId: data.linkedId,
      phone: data.phone,
      photoURL: data.photoURL,
      isActive: data.isActive,
      quickPinEnabled: data.quickPinEnabled,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    } as UserProfile;
  });

  return [...staffUsers, ...studentUsers, ...parentUsers].sort((a, b) =>
    a.displayName.localeCompare(b.displayName),
  );
}

export async function createUserProfile(
  uid: string,
  profile: Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt'>,
): Promise<void> {
  await saveUserProfile(uid, profile);
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  const existing = await fetchUserProfileByUid(uid);
  if (!existing) throw new Error('User profile not found');
  await patchUserProfile(uid, existing.accountType, data);
}
