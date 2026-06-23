import { AccountType, StaffRole, UserProfile, UserRole } from '@/types';
import { getAdminAuth, getAdminDb } from './firebase-admin-server';
import { isQuickPinPepperMissingError, setQuickPinForUser } from './pin-auth-server';
import {
  getAccountCollection,
  PARENTS_COLLECTION,
  STAFF_USERS_COLLECTION,
  STUDENT_USERS_COLLECTION,
  staffRoleToUserRole,
} from './user-profiles';
import { isValidQuickPin, normalizeLinkedId } from './quick-pin';

export type CreateLoginInput = {
  email: string;
  password: string;
  displayName: string;
  accountType: AccountType;
  staffRole?: StaffRole;
  linkedId?: string;
  phone?: string;
  enableQuickPin?: boolean;
  quickPin?: string;
  mustChangePassword?: boolean;
};

export type CreateLoginResult = {
  uid: string;
  profile: Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt'>;
  /** True when an existing Firebase Auth user was linked to a new Firestore profile. */
  linkedExistingAuth?: boolean;
  /** True when profile already existed and was updated. */
  updatedExistingProfile?: boolean;
  /** Set when login succeeded but Quick PIN could not be saved (e.g. missing QUICK_PIN_PEPPER). */
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
  data: Record<string, unknown>;
} | null> {
  const db = getAdminDb();
  for (const collection of ALL_LOGIN_COLLECTIONS) {
    const snap = await db.collection(collection).doc(uid).get();
    if (snap.exists) return { collection, data: snap.data()! };
  }
  return null;
}

async function findProfileByLinkedId(
  accountType: AccountType,
  linkedId: string,
): Promise<{ uid: string; email: string } | null> {
  const db = getAdminDb();
  const collection = getAccountCollection(accountType);
  const normalized = normalizeLinkedId(linkedId);
  const snap = await db
    .collection(collection)
    .where('linkedId', '==', normalized)
    .limit(1)
    .get();
  if (snap.empty) {
    const snapLower = await db
      .collection(collection)
      .where('linkedId', '==', linkedId.trim())
      .limit(1)
      .get();
    if (snapLower.empty) return null;
    const doc = snapLower.docs[0];
    return { uid: doc.id, email: (doc.data().email as string) || '' };
  }
  const doc = snap.docs[0];
  return { uid: doc.id, email: (doc.data().email as string) || '' };
}

function buildProfilePayload(
  input: CreateLoginInput,
  email: string,
  displayName: string,
  linkedId: string | undefined,
  phone: string | undefined,
): Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt'> {
  const role: UserRole =
    input.accountType === 'staff'
      ? staffRoleToUserRole(input.staffRole ?? 'teacher')
      : input.accountType === 'student'
        ? 'student'
        : 'parent';

  return {
    email,
    displayName,
    role,
    accountType: input.accountType,
    staffRole: input.accountType === 'staff' ? (input.staffRole ?? 'teacher') : undefined,
    linkedId,
    phone: phone || undefined,
    isActive: true,
    quickPinEnabled: false,
    mustChangePassword: input.mustChangePassword === true ? true : undefined,
  };
}

function firestoreDocPayload(
  input: CreateLoginInput,
  profile: Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt'>,
  linkedId: string | undefined,
  phone: string | undefined,
  mergeCreatedAt?: Date,
) {
  const base = {
    email: profile.email,
    displayName: profile.displayName,
    linkedId: linkedId ?? null,
    phone: phone || null,
    photoURL: null,
    isActive: true,
    quickPinEnabled: profile.quickPinEnabled ?? false,
    updatedAt: new Date(),
  };
  if (input.accountType === 'staff') {
    return {
      ...base,
      staffRole: profile.staffRole,
      ...(mergeCreatedAt ? { createdAt: mergeCreatedAt } : { createdAt: new Date() }),
    };
  }
  return {
    ...base,
    mustChangePassword: profile.mustChangePassword === true ? true : null,
    ...(mergeCreatedAt ? { createdAt: mergeCreatedAt } : { createdAt: new Date() }),
  };
}

async function applyQuickPin(
  input: CreateLoginInput,
  uid: string,
  linkedId: string,
  profile: Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt'>,
): Promise<string | undefined> {
  if (!input.enableQuickPin || !input.quickPin) return undefined;
  if (!isValidQuickPin(input.quickPin)) {
    throw new Error('Quick PIN must be 4–6 digits.');
  }
  try {
    await setQuickPinForUser({
      uid,
      linkedId,
      accountType: input.accountType,
      pin: input.quickPin,
      skipLinkedIdCheck: true,
    });
    profile.quickPinEnabled = true;
    return undefined;
  } catch (err: unknown) {
    if (isQuickPinPepperMissingError(err)) {
      profile.quickPinEnabled = false;
      return 'QUICK_PIN_PEPPER is not configured on the server. Login was created with email/password only.';
    }
    throw err;
  }
}

async function writeProfile(
  uid: string,
  input: CreateLoginInput,
  profile: Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt'>,
  linkedId: string | undefined,
  phone: string | undefined,
  existingCreatedAt?: Date,
): Promise<void> {
  const collection = getAccountCollection(input.accountType);
  const db = getAdminDb();
  await db
    .collection(collection)
    .doc(uid)
    .set(firestoreDocPayload(input, profile, linkedId, phone, existingCreatedAt), { merge: !!existingCreatedAt });
}

/**
 * Create a new login, or link an existing Firebase Auth email to a staff/student/parent profile.
 */
export async function createLoginAccount(input: CreateLoginInput): Promise<CreateLoginResult> {
  const email = input.email.trim().toLowerCase();
  const displayName = input.displayName.trim();
  const linkedId = input.linkedId?.trim();
  const phone = input.phone?.trim();

  if (!email || !displayName) throw new Error('Email and display name are required.');
  if (!input.password || input.password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }
  if (
    (input.accountType === 'staff' || input.accountType === 'student' || input.accountType === 'parent') &&
    !linkedId
  ) {
    throw new Error('Staff ID or admission number is required.');
  }

  const adminAuth = getAdminAuth();
  const profile = buildProfilePayload(input, email, displayName, linkedId, phone);

  if (linkedId) {
    const existingById = await findProfileByLinkedId(input.accountType, linkedId);
    if (existingById && existingById.email.toLowerCase() !== email) {
      throw new Error(
        `This ${input.accountType === 'staff' ? 'Staff ID' : 'admission number'} is already linked to login ${existingById.email}.`,
      );
    }
  }

  let uid: string | null = null;
  let createdAuthUser = false;

  try {
    try {
      const user = await adminAuth.createUser({
        email,
        password: input.password,
        displayName,
        emailVerified: true,
      });
      uid = user.uid;
      createdAuthUser = true;
    } catch (err: unknown) {
      if (!isEmailInUseError(err)) throw err;

      const existing = await adminAuth.getUserByEmail(email);
      uid = existing.uid;

      const existingProfile = await findProfileByUid(uid);
      const targetCollection = getAccountCollection(input.accountType);

      if (existingProfile) {
        if (existingProfile.collection !== targetCollection) {
          throw new Error(
            `This email is already used for a ${existingProfile.collection.replace('_', ' ')} account. Use a different email.`,
          );
        }
        const currentLinked = (existingProfile.data.linkedId as string | undefined) || '';
        const wantLinked = normalizeLinkedId(linkedId || '');
        if (currentLinked && wantLinked && normalizeLinkedId(currentLinked) !== wantLinked) {
          throw new Error(
            `This email is already linked to ${currentLinked}. Use that record in User Management or pick a different email.`,
          );
        }

        await adminAuth.updateUser(uid, { password: input.password, displayName });
        const createdAt =
          existingProfile.data.createdAt &&
          typeof (existingProfile.data.createdAt as { toDate?: () => Date }).toDate === 'function'
            ? (existingProfile.data.createdAt as { toDate: () => Date }).toDate()
            : undefined;
        await writeProfile(uid, input, profile, linkedId, phone, createdAt);
        const quickPinWarning = await applyQuickPin(input, uid, linkedId!, profile);

        return { uid, profile, updatedExistingProfile: true, quickPinWarning };
      }

      await adminAuth.updateUser(uid, { password: input.password, displayName });
      await writeProfile(uid, input, profile, linkedId, phone);
      const quickPinWarning = await applyQuickPin(input, uid, linkedId!, profile);

      return { uid, profile, linkedExistingAuth: true, quickPinWarning };
    }

    await writeProfile(uid!, input, profile, linkedId, phone);
    const quickPinWarning = await applyQuickPin(input, uid!, linkedId!, profile);

    return { uid: uid!, profile, quickPinWarning };
  } catch (err: unknown) {
    if (createdAuthUser && uid) {
      try {
        await adminAuth.deleteUser(uid);
      } catch {
        /* ignore */
      }
      try {
        await getAdminDb().collection(getAccountCollection(input.accountType)).doc(uid).delete();
      } catch {
        /* ignore */
      }
    }

    if (isEmailInUseError(err)) {
      throw new Error(
        'This email is already registered. The system tried to link it automatically but could not — use a different email or contact support.',
      );
    }

    const code = (err as { code?: string })?.code ?? '';
    const msg = err instanceof Error ? err.message : String(err);
    if (code === 'auth/invalid-email' || msg.toLowerCase().includes('invalid-email')) {
      throw new Error('Invalid email address.');
    }
    if (
      code === 'auth/invalid-password' ||
      msg.toLowerCase().includes('invalid-password') ||
      msg.toLowerCase().includes('weak-password')
    ) {
      throw new Error('Password must be at least 6 characters.');
    }
    throw err instanceof Error ? err : new Error('Failed to create login.');
  }
}
