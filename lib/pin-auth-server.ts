import { createHmac, timingSafeEqual } from 'crypto';
import { AccountType } from '@/types';
import { getAdminAuth, getAdminDb } from './firebase-admin-server';
import {
  PIN_CREDENTIALS_COLLECTION,
  isValidQuickPin,
  normalizeLinkedId,
  normalizeQuickPin,
  pinCredentialDocId,
} from './quick-pin';
import {
  getAccountCollection,
  STAFF_USERS_COLLECTION,
  fetchUserProfileByUid,
} from './user-profiles';
import {
  assertPinLoginAllowed,
  clearPinLoginAttempts,
  recordPinLoginFailure,
} from './pin-login-rate-limit';

export const QUICK_PIN_PEPPER_MISSING = 'QUICK_PIN_PEPPER is not configured.';

export function isQuickPinPepperMissingError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('QUICK_PIN_PEPPER');
}

function pinPepper(): string {
  const pepper = process.env.QUICK_PIN_PEPPER?.trim();
  if (process.env.NODE_ENV === 'production' && !pepper) {
    throw new Error(QUICK_PIN_PEPPER_MISSING);
  }
  return pepper || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'delta-gemunupura-quick-pin';
}

export function hashQuickPin(pin: string, linkedId: string, accountType: AccountType): string {
  const normalizedPin = normalizeQuickPin(pin);
  const id = normalizeLinkedId(linkedId);
  return createHmac('sha256', pinPepper())
    .update(`${accountType}:${id}:${normalizedPin}`)
    .digest('hex');
}

function verifyPinHash(
  pin: string,
  linkedId: string,
  accountType: AccountType,
  storedHash: string,
): boolean {
  const computed = hashQuickPin(pin, linkedId, accountType);
  try {
    return timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(storedHash, 'hex'));
  } catch {
    return false;
  }
}

export async function setQuickPinForUser(params: {
  uid: string;
  linkedId: string;
  accountType: AccountType;
  pin: string;
  /** When true, skip linkedId ownership check (admin provisioning). */
  skipLinkedIdCheck?: boolean;
}): Promise<void> {
  const { uid, linkedId, accountType, pin, skipLinkedIdCheck = false } = params;
  if (!isValidQuickPin(pin)) {
    throw new Error('PIN must be 4–6 digits.');
  }

  const normalizedId = normalizeLinkedId(linkedId);
  if (!normalizedId) throw new Error('Linked ID is required.');

  if (!skipLinkedIdCheck) {
    const profile = await fetchUserProfileByUid(uid);
    if (!profile) throw new Error('Account profile not found.');
    if (profile.accountType !== accountType) {
      throw new Error('Account type does not match this login.');
    }
    const profileLinkedId = normalizeLinkedId(profile.linkedId ?? '');
    if (!profileLinkedId || profileLinkedId !== normalizedId) {
      throw new Error('Linked ID does not match this account.');
    }
  }

  const db = getAdminDb();
  const credId = pinCredentialDocId(accountType, normalizedId);
  const pinHash = hashQuickPin(pin, normalizedId, accountType);

  await db.collection(PIN_CREDENTIALS_COLLECTION).doc(credId).set(
    {
      uid,
      linkedId: normalizedId,
      accountType,
      pinHash,
      updatedAt: new Date(),
    },
    { merge: true },
  );

  await db.collection(getAccountCollection(accountType)).doc(uid).set(
    { quickPinEnabled: true, updatedAt: new Date() },
    { merge: true },
  );
}

export async function removeQuickPinForUser(params: {
  uid: string;
  linkedId: string;
  accountType: AccountType;
}): Promise<void> {
  const db = getAdminDb();
  const credId = pinCredentialDocId(params.accountType, params.linkedId);
  await db.collection(PIN_CREDENTIALS_COLLECTION).doc(credId).delete();
  await db.collection(getAccountCollection(params.accountType)).doc(params.uid).set(
    { quickPinEnabled: false, updatedAt: new Date() },
    { merge: true },
  );
}

export async function verifyQuickPinLogin(params: {
  linkedId: string;
  pin: string;
  accountType: AccountType;
}): Promise<{ customToken: string }> {
  const { linkedId, pin, accountType } = params;
  if (!isValidQuickPin(pin)) {
    throw new Error('Invalid PIN.');
  }

  const normalizedId = normalizeLinkedId(linkedId);
  if (!normalizedId) throw new Error('Enter your ID.');

  await assertPinLoginAllowed(accountType, normalizedId);

  const db = getAdminDb();
  const credSnap = await db
    .collection(PIN_CREDENTIALS_COLLECTION)
    .doc(pinCredentialDocId(accountType, normalizedId))
    .get();

  if (!credSnap.exists) {
    throw new Error('No Quick PIN found for this ID. Use email login or contact admin.');
  }

  const cred = credSnap.data()!;
  if (cred.accountType !== accountType) {
    throw new Error('Account type does not match this ID.');
  }

  if (!verifyPinHash(pin, normalizedId, accountType, cred.pinHash as string)) {
    await recordPinLoginFailure(accountType, normalizedId);
    throw new Error('Incorrect PIN.');
  }

  await clearPinLoginAttempts(accountType, normalizedId);

  const uid = cred.uid as string;
  const profileSnap = await db.collection(getAccountCollection(accountType)).doc(uid).get();
  if (!profileSnap.exists || profileSnap.data()?.isActive === false) {
    throw new Error('This account is inactive. Contact your administrator.');
  }

  const customToken = await getAdminAuth().createCustomToken(uid);
  return { customToken };
}

export async function isStaffAdminUid(uid: string): Promise<boolean> {
  return (await getStaffAdminCheck(uid)).isAdmin;
}

export async function getStaffAdminCheck(uid: string): Promise<{
  isAdmin: boolean;
  staffRole?: string;
  reason?: string;
}> {
  const snap = await getAdminDb().collection(STAFF_USERS_COLLECTION).doc(uid).get();
  if (!snap.exists) {
    return {
      isAdmin: false,
      reason:
        'Your Firebase account has no staff_users profile. Ask an administrator to create your login.',
    };
  }
  const staffRole = snap.data()?.staffRole as string | undefined;
  if (staffRole === 'principal' || staffRole === 'technical_officer') {
    return { isAdmin: true, staffRole };
  }
  return {
    isAdmin: false,
    staffRole,
    reason: `Your role is "${staffRole ?? 'unknown'}". Only Principal or Technical Officer can create logins.`,
  };
}
