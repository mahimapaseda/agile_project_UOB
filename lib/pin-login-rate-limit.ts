import { getAdminDb } from './firebase-admin-server';
import { normalizeLinkedId } from './quick-pin';
import { AccountType } from '@/types';

const ATTEMPTS_COLLECTION = 'pin_login_attempts';
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

function attemptDocId(accountType: AccountType, linkedId: string): string {
  return `${accountType}_${normalizeLinkedId(linkedId)}`;
}

export async function assertPinLoginAllowed(
  accountType: AccountType,
  linkedId: string,
): Promise<void> {
  const db = getAdminDb();
  const snap = await db.collection(ATTEMPTS_COLLECTION).doc(attemptDocId(accountType, linkedId)).get();
  if (!snap.exists) return;

  const data = snap.data()!;
  const lockedUntil = data.lockedUntil?.toDate?.() as Date | undefined;
  if (lockedUntil && lockedUntil.getTime() > Date.now()) {
    const minutes = Math.ceil((lockedUntil.getTime() - Date.now()) / 60000);
    throw new Error(`Too many failed attempts. Try again in ${minutes} minute(s) or use email login.`);
  }
}

export async function recordPinLoginFailure(
  accountType: AccountType,
  linkedId: string,
): Promise<void> {
  const db = getAdminDb();
  const ref = db.collection(ATTEMPTS_COLLECTION).doc(attemptDocId(accountType, linkedId));
  const snap = await ref.get();
  const prev = snap.exists ? (snap.data()?.failCount as number) || 0 : 0;
  const failCount = prev + 1;
  const payload: Record<string, unknown> = {
    failCount,
    updatedAt: new Date(),
  };
  if (failCount >= MAX_ATTEMPTS) {
    payload.lockedUntil = new Date(Date.now() + LOCKOUT_MS);
  }
  await ref.set(payload, { merge: true });
}

export async function clearPinLoginAttempts(
  accountType: AccountType,
  linkedId: string,
): Promise<void> {
  const db = getAdminDb();
  await db.collection(ATTEMPTS_COLLECTION).doc(attemptDocId(accountType, linkedId)).delete();
}
