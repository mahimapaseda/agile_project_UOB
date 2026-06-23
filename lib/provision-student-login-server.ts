import { Student } from '@/types';
import { createLoginAccount } from './admin-create-login-server';
import { updateLoginAccount } from './admin-update-login-server';
import { getAdminDb } from './firebase-admin-server';
import {
  buildStudentLoginEmail,
  buildStudentLoginWhatsAppMessage,
  buildStudentLoginWhatsAppShareUrl,
  generateTemporaryPassword,
  isLegacySyntheticStudentEmail,
  migrateLegacyStudentLoginEmail,
  resolveStudentLoginEmail,
  resolveStudentWhatsAppPhone,
} from './student-login-credentials';
import { matchStudentLogin } from './user-management';
import { UserProfile } from '@/types';

export type ProvisionStudentLoginResult = {
  admissionNumber: string;
  studentName: string;
  studentId: string;
  email: string;
  temporaryPassword: string;
  whatsappPhone: string | null;
  whatsappShareUrl: string | null;
  created: boolean;
  resetPassword: boolean;
};

export type BulkProvisionStudentResult = {
  admissionNumber: string;
  studentName: string;
  success: boolean;
  error?: string;
  email?: string;
  temporaryPassword?: string;
  whatsappPhone?: string | null;
  whatsappShareUrl?: string | null;
  created?: boolean;
  resetPassword?: boolean;
};

async function findStudentByAdmissionNumber(admissionNumber: string): Promise<Student | null> {
  const db = getAdminDb();
  const trimmed = admissionNumber.trim();
  const queries = [trimmed, trimmed.toUpperCase(), trimmed.toLowerCase()];
  const seen = new Set<string>();

  for (const value of queries) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    const snap = await db.collection('students').where('admissionNumber', '==', value).limit(1).get();
    if (!snap.empty) {
      const doc = snap.docs[0];
      return { id: doc.id, ...doc.data() } as Student;
    }
  }

  return null;
}

async function loadStudentLogins(): Promise<UserProfile[]> {
  const db = getAdminDb();
  const snap = await db.collection('student_users').get();
  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      uid: doc.id,
      email: data.email as string,
      displayName: data.displayName as string,
      role: 'student' as const,
      accountType: 'student' as const,
      linkedId: data.linkedId as string | undefined,
      phone: data.phone as string | undefined,
      isActive: data.isActive !== false,
      mustChangePassword: data.mustChangePassword === true,
      quickPinEnabled: data.quickPinEnabled === true,
      createdAt: data.createdAt as UserProfile['createdAt'],
      updatedAt: data.updatedAt as UserProfile['updatedAt'],
    };
  });
}

function buildSharePayload(
  student: Student,
  email: string,
  temporaryPassword: string,
): Pick<ProvisionStudentLoginResult, 'whatsappPhone' | 'whatsappShareUrl'> {
  const whatsappPhone = resolveStudentWhatsAppPhone(student);
  const message = buildStudentLoginWhatsAppMessage({
    studentName: student.name,
    admissionNumber: student.admissionNumber,
    email,
    temporaryPassword,
  });
  const whatsappShareUrl = whatsappPhone
    ? buildStudentLoginWhatsAppShareUrl(whatsappPhone, message)
    : null;
  return { whatsappPhone, whatsappShareUrl };
}

async function setMustChangePassword(uid: string, value: boolean): Promise<void> {
  await getAdminDb().collection('student_users').doc(uid).set(
    { mustChangePassword: value, updatedAt: new Date() },
    { merge: true },
  );
}

/**
 * Create or reset a student login with a temporary password and WhatsApp share payload.
 */
export async function provisionStudentLogin(
  admissionNumber: string,
  options?: { resetExisting?: boolean },
): Promise<ProvisionStudentLoginResult> {
  const student = await findStudentByAdmissionNumber(admissionNumber);
  if (!student) {
    throw new Error(`No student found with admission number ${admissionNumber}.`);
  }

  const logins = await loadStudentLogins();
  const existingLogin = matchStudentLogin(student, logins);
  const email = resolveStudentLoginEmail(student);
  const temporaryPassword = generateTemporaryPassword();
  const phone = resolveStudentWhatsAppPhone(student) || undefined;

  if (existingLogin) {
    if (!options?.resetExisting) {
      throw new Error(
        `Student ${student.admissionNumber} already has a login (${existingLogin.email}). Use reset to issue a new temporary password.`,
      );
    }

    await updateLoginAccount({
      uid: existingLogin.uid,
      password: temporaryPassword,
      email,
      displayName: student.name,
      phone,
      enableQuickPin: false,
    });
    await setMustChangePassword(existingLogin.uid, true);

    const share = buildSharePayload(student, email, temporaryPassword);
    return {
      admissionNumber: student.admissionNumber,
      studentName: student.name,
      studentId: student.id,
      email,
      temporaryPassword,
      ...share,
      created: false,
      resetPassword: true,
    };
  }

  await createLoginAccount({
    email,
    password: temporaryPassword,
    displayName: student.name,
    accountType: 'student',
    linkedId: student.admissionNumber,
    phone,
    enableQuickPin: false,
    mustChangePassword: true,
  });

  const share = buildSharePayload(student, email, temporaryPassword);
  return {
    admissionNumber: student.admissionNumber,
    studentName: student.name,
    studentId: student.id,
    email,
    temporaryPassword,
    ...share,
    created: true,
    resetPassword: false,
  };
}

export async function provisionStudentLoginsBulk(input: {
  admissionNumbers?: string[];
  onlyWithoutLogin?: boolean;
}): Promise<BulkProvisionStudentResult[]> {
  const db = getAdminDb();
  const logins = await loadStudentLogins();
  let students: Student[];

  if (input.admissionNumbers?.length) {
    const results: BulkProvisionStudentResult[] = [];
    for (const admissionNumber of input.admissionNumbers) {
      try {
        const row = await provisionStudentLogin(admissionNumber, { resetExisting: false });
        results.push({
          admissionNumber: row.admissionNumber,
          studentName: row.studentName,
          success: true,
          email: row.email,
          temporaryPassword: row.temporaryPassword,
          whatsappPhone: row.whatsappPhone,
          whatsappShareUrl: row.whatsappShareUrl,
          created: row.created,
          resetPassword: row.resetPassword,
        });
      } catch (err: unknown) {
        results.push({
          admissionNumber,
          studentName: admissionNumber,
          success: false,
          error: err instanceof Error ? err.message : 'Failed to provision login.',
        });
      }
    }
    return results;
  }

  const snap = await db.collection('students').where('status', '==', 'active').get();
  students = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Student);

  if (input.onlyWithoutLogin) {
    students = students.filter((student) => !matchStudentLogin(student, logins));
  }

  students.sort((a, b) => a.name.localeCompare(b.name));

  const results: BulkProvisionStudentResult[] = [];
  for (const student of students.slice(0, 100)) {
    try {
      const row = await provisionStudentLogin(student.admissionNumber, { resetExisting: false });
      results.push({
        admissionNumber: row.admissionNumber,
        studentName: row.studentName,
        success: true,
        email: row.email,
        temporaryPassword: row.temporaryPassword,
        whatsappPhone: row.whatsappPhone,
        whatsappShareUrl: row.whatsappShareUrl,
        created: row.created,
        resetPassword: row.resetPassword,
      });
    } catch (err: unknown) {
      results.push({
        admissionNumber: student.admissionNumber,
        studentName: student.name,
        success: false,
        error: err instanceof Error ? err.message : 'Failed to provision login.',
      });
    }
  }

  return results;
}

export async function clearMustChangePassword(uid: string): Promise<void> {
  await setMustChangePassword(uid, false);
}

export async function getMustChangePassword(uid: string): Promise<boolean> {
  const snap = await getAdminDb().collection('student_users').doc(uid).get();
  if (!snap.exists) return false;
  return snap.data()?.mustChangePassword === true;
}

export type MigrateStudentLoginEmailResult = {
  uid: string;
  admissionNumber: string;
  oldEmail: string;
  newEmail?: string;
  success: boolean;
  error?: string;
};

/** Update Firebase Auth + Firestore emails from @student.dgmvdbms.vercel.app → @student.dgmv. */
export async function migrateLegacyStudentLoginEmails(input?: {
  admissionNumbers?: string[];
}): Promise<MigrateStudentLoginEmailResult[]> {
  const db = getAdminDb();
  const snap = await db.collection('student_users').get();
  const filter = input?.admissionNumbers?.map((n) => n.trim().toLowerCase()).filter(Boolean);
  const results: MigrateStudentLoginEmailResult[] = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const email = ((data.email as string) || '').trim();
    const admissionNumber = ((data.linkedId as string) || '').trim();
    if (!email || !admissionNumber) continue;
    if (filter && !filter.includes(admissionNumber.toLowerCase())) continue;
    if (!isLegacySyntheticStudentEmail(email)) continue;

    const newEmail = migrateLegacyStudentLoginEmail(email, admissionNumber) ?? buildStudentLoginEmail(admissionNumber);
    if (newEmail.toLowerCase() === email.toLowerCase()) continue;

    try {
      await updateLoginAccount({ uid: doc.id, email: newEmail });
      results.push({
        uid: doc.id,
        admissionNumber,
        oldEmail: email,
        newEmail,
        success: true,
      });
    } catch (err: unknown) {
      results.push({
        uid: doc.id,
        admissionNumber,
        oldEmail: email,
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update username.',
      });
    }
  }

  return results;
}
