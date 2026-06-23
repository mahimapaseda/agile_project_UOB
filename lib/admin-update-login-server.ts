import { StaffRole, UserProfile, UserRole } from '@/types';
import { getAdminAuth, getAdminDb } from './firebase-admin-server';
import { isQuickPinPepperMissingError, removeQuickPinForUser, setQuickPinForUser } from './pin-auth-server';
import {
  getAccountCollection,
  PARENTS_COLLECTION,
  STAFF_USERS_COLLECTION,
  staffRoleToUserRole,
  STUDENT_USERS_COLLECTION,
} from './user-profiles';
import { isValidQuickPin } from './quick-pin';

export type UpdateLoginInput = {
  uid: string;
  email?: string;
  password?: string;
  displayName?: string;
  phone?: string;
  staffRole?: StaffRole;
  enableQuickPin?: boolean;
  quickPin?: string;
};

export type UpdateLoginResult = {
  uid: string;
  profile: Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt'>;
  quickPinWarning?: string;
};

const ALL_LOGIN_COLLECTIONS = [
  STAFF_USERS_COLLECTION,
  STUDENT_USERS_COLLECTION,
  PARENTS_COLLECTION,
] as const;

function isEmailInUseError(err: unknown): boolean {
  const code = (err as { code?: string })?.code ?? '';
  const msg = err instanceof Error ? err.message : String(err);
  const lower = `${code} ${msg}`.toLowerCase();
  return (
    code === 'auth/email-already-exists' ||
    lower.includes('email-already') ||
    lower.includes('already in use') ||
    lower.includes('already exists')
  );
}

async function findProfileByUid(uid: string): Promise<{
  collection: string;
  accountType: UserProfile['accountType'];
  data: Record<string, unknown>;
} | null> {
  const db = getAdminDb();
  for (const collection of ALL_LOGIN_COLLECTIONS) {
    const snap = await db.collection(collection).doc(uid).get();
    if (!snap.exists) continue;
    const accountType: UserProfile['accountType'] =
      collection === STAFF_USERS_COLLECTION
        ? 'staff'
        : collection === STUDENT_USERS_COLLECTION
          ? 'student'
          : 'parent';
    return { collection, accountType, data: snap.data()! };
  }
  return null;
}

function buildProfileFromDoc(
  accountType: UserProfile['accountType'],
  data: Record<string, unknown>,
  overrides: {
    email: string;
    displayName: string;
    phone?: string;
    staffRole?: StaffRole;
    quickPinEnabled: boolean;
  },
): Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt'> {
  const role: UserRole =
    accountType === 'staff'
      ? staffRoleToUserRole(overrides.staffRole ?? (data.staffRole as StaffRole) ?? 'teacher')
      : accountType === 'student'
        ? 'student'
        : 'parent';

  return {
    email: overrides.email,
    displayName: overrides.displayName,
    role,
    accountType,
    staffRole: accountType === 'staff' ? overrides.staffRole ?? (data.staffRole as StaffRole) : undefined,
    linkedId: (data.linkedId as string | undefined) || undefined,
    allowedStudentGrades: (data.allowedStudentGrades as string[] | undefined) || undefined,
    phone: overrides.phone || undefined,
    photoURL: (data.photoURL as string | undefined) || undefined,
    quickPinEnabled: overrides.quickPinEnabled,
    isActive: data.isActive !== false,
  };
}

export async function updateLoginAccount(input: UpdateLoginInput): Promise<UpdateLoginResult> {
  const uid = input.uid.trim();
  if (!uid) throw new Error('User ID is required.');

  const existing = await findProfileByUid(uid);
  if (!existing) throw new Error('Login not found.');

  const { accountType, data } = existing;
  const linkedId = ((data.linkedId as string | undefined) || '').trim();
  if (!linkedId) throw new Error('This login is missing a linked ID.');

  const email = (input.email ?? (data.email as string)).trim().toLowerCase();
  const displayName = (input.displayName ?? (data.displayName as string)).trim();
  const phone = input.phone !== undefined ? input.phone.trim() : ((data.phone as string | undefined) || '').trim();
  const staffRole =
    accountType === 'staff'
      ? input.staffRole ?? ((data.staffRole as StaffRole | undefined) ?? 'teacher')
      : undefined;

  if (!email || !displayName) throw new Error('Email and display name are required.');
  if (input.password && input.password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  const adminAuth = getAdminAuth();
  const currentEmail = ((data.email as string) || '').trim().toLowerCase();

  if (email !== currentEmail) {
    try {
      const other = await adminAuth.getUserByEmail(email);
      if (other.uid !== uid) {
        throw new Error('This email is already used by another account.');
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      if (code !== 'auth/user-not-found') {
        if (err instanceof Error && err.message.includes('already used')) throw err;
        if (!isEmailInUseError(err)) throw err;
        throw new Error('This email is already used by another account.');
      }
    }
  }

  const authUpdate: { email?: string; password?: string; displayName: string } = { displayName };
  if (email !== currentEmail) authUpdate.email = email;
  if (input.password) authUpdate.password = input.password;

  try {
    await adminAuth.updateUser(uid, authUpdate);
  } catch (err: unknown) {
    if (isEmailInUseError(err)) {
      throw new Error('This email is already used by another account.');
    }
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes('invalid-email')) throw new Error('Invalid email address.');
    if (msg.toLowerCase().includes('invalid-password') || msg.toLowerCase().includes('weak-password')) {
      throw new Error('Password must be at least 6 characters.');
    }
    throw err instanceof Error ? err : new Error('Failed to update login.');
  }

  const wasPinEnabled = data.quickPinEnabled === true;
  let quickPinEnabled = wasPinEnabled;
  let quickPinWarning: string | undefined;

  if (input.enableQuickPin === false && wasPinEnabled) {
    await removeQuickPinForUser({ uid, linkedId, accountType });
    quickPinEnabled = false;
  } else if (input.enableQuickPin === true) {
    if (input.quickPin) {
      if (!isValidQuickPin(input.quickPin)) {
        throw new Error('Quick PIN must be 4–6 digits.');
      }
      try {
        await setQuickPinForUser({ uid, linkedId, accountType, pin: input.quickPin, skipLinkedIdCheck: true });
        quickPinEnabled = true;
      } catch (err: unknown) {
        if (isQuickPinPepperMissingError(err)) {
          quickPinEnabled = wasPinEnabled;
          quickPinWarning =
            'QUICK_PIN_PEPPER is not configured on the server. Other login details were saved; Quick PIN was not enabled.';
        } else {
          throw err;
        }
      }
    } else if (!wasPinEnabled) {
      throw new Error('Enter a Quick PIN to enable PIN login.');
    }
  }

  const firestorePayload: Record<string, unknown> = {
    email,
    displayName,
    phone: phone || null,
    updatedAt: new Date(),
  };
  if (accountType === 'staff' && staffRole) {
    firestorePayload.staffRole = staffRole;
  }
  if (input.enableQuickPin !== undefined) {
    firestorePayload.quickPinEnabled = quickPinEnabled;
  }

  await getAdminDb().collection(getAccountCollection(accountType)).doc(uid).set(firestorePayload, { merge: true });

  const profile = buildProfileFromDoc(accountType, data, {
    email,
    displayName,
    phone: phone || undefined,
    staffRole,
    quickPinEnabled,
  });

  return { uid, profile, quickPinWarning };
}
