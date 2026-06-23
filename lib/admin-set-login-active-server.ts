import { AccountType } from '@/types';
import { getAdminAuth, getAdminDb } from './firebase-admin-server';
import {
  fetchUserProfileByUid,
  STAFF_USERS_COLLECTION,
  STUDENT_USERS_COLLECTION,
  PARENTS_COLLECTION,
} from './user-profiles';

const ALL_LOGIN_COLLECTIONS = [
  STAFF_USERS_COLLECTION,
  STUDENT_USERS_COLLECTION,
  PARENTS_COLLECTION,
] as const;

async function findLoginCollection(uid: string): Promise<string | null> {
  const db = getAdminDb();
  for (const collection of ALL_LOGIN_COLLECTIONS) {
    const snap = await db.collection(collection).doc(uid).get();
    if (snap.exists) return collection;
  }
  return null;
}

/** Enable or disable a login in Firestore and Firebase Auth. */
export async function setLoginActiveStatus(uid: string, isActive: boolean): Promise<void> {
  const collection = await findLoginCollection(uid);
  if (!collection) throw new Error('Login not found.');

  await getAdminDb().collection(collection).doc(uid).set(
    { isActive, updatedAt: new Date() },
    { merge: true },
  );

  await getAdminAuth().updateUser(uid, { disabled: !isActive });
}

export type SetLoginActiveResult = {
  uid: string;
  isActive: boolean;
};

export async function setLoginActiveWithProfile(
  uid: string,
  isActive: boolean,
): Promise<SetLoginActiveResult> {
  await setLoginActiveStatus(uid, isActive);
  const profile = await fetchUserProfileByUid(uid);
  if (!profile) throw new Error('Login profile not found after update.');
  return { uid, isActive: profile.isActive };
}
