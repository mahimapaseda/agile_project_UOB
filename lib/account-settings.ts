import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  type User,
} from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { getAccountCollection } from './user-profiles';
import { UserProfile } from '@/types';

export interface OwnProfileUpdate {
  displayName: string;
  phone?: string;
}

export async function updateOwnProfile(
  uid: string,
  accountType: UserProfile['accountType'],
  data: OwnProfileUpdate
): Promise<void> {
  const ref = doc(db, getAccountCollection(accountType), uid);
  await updateDoc(ref, {
    displayName: data.displayName.trim(),
    phone: data.phone?.trim() || null,
    updatedAt: serverTimestamp(),
  });
}

export async function changeOwnPassword(
  user: User,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  if (!user.email) {
    throw new Error('No email on account');
  }
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}

export async function completeStudentPasswordSetup(
  idToken: string,
  newPassword: string,
): Promise<void> {
  const { requestCompletePasswordSetup } = await import('./admin-auth-client');
  await requestCompletePasswordSetup(idToken, newPassword);
}

export function mapAuthPasswordError(err: unknown): string {
  const msg = err instanceof Error ? err.message : '';
  if (msg.includes('wrong-password') || msg.includes('invalid-credential')) {
    return 'Current password is incorrect.';
  }
  if (msg.includes('weak-password')) {
    return 'New password must be at least 6 characters.';
  }
  if (msg.includes('requires-recent-login')) {
    return 'Please sign out and sign in again, then retry.';
  }
  return 'Could not update password. Please try again.';
}
