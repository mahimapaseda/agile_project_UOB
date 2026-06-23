import { randomBytes } from 'crypto';
import { buildWhatsAppHref } from './contact-links';
import { PWA } from './pwa-config';
import { Student } from '@/types';

export const STUDENT_LOGIN_EMAIL_DOMAIN = 'student.dgmv';
/** Previous auto-generated student login domain (migrate to {@link STUDENT_LOGIN_EMAIL_DOMAIN}). */
export const LEGACY_STUDENT_LOGIN_EMAIL_DOMAIN = 'student.dgmvdbms.vercel.app';
export const STUDENT_PORTAL_LOGIN_URL = `${PWA.origin}/login`;
export const STUDENT_PORTAL_TECH_SUPPORT_NAME = 'Mahima Paseda';
export const STUDENT_PORTAL_TECH_SUPPORT_PHONE = '0770114407';

export function isLegacySyntheticStudentEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(`@${LEGACY_STUDENT_LOGIN_EMAIL_DOMAIN}`);
}

export function isSyntheticStudentLoginEmail(email: string): boolean {
  const lower = email.trim().toLowerCase();
  return (
    lower.endsWith(`@${STUDENT_LOGIN_EMAIL_DOMAIN}`)
    || lower.endsWith(`@${LEGACY_STUDENT_LOGIN_EMAIL_DOMAIN}`)
  );
}

/** Map legacy synthetic username to the current format, or null if not a legacy synthetic email. */
export function migrateLegacyStudentLoginEmail(
  currentEmail: string,
  admissionNumber: string,
): string | null {
  if (!isLegacySyntheticStudentEmail(currentEmail)) return null;
  return buildStudentLoginEmail(admissionNumber);
}

const TEMP_PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

export function isValidLoginEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function buildStudentLoginEmail(admissionNumber: string): string {
  const id = admissionNumber.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${id || 'student'}@${STUDENT_LOGIN_EMAIL_DOMAIN}`;
}

export function resolveStudentLoginEmail(student: Pick<Student, 'email' | 'admissionNumber'>): string {
  const personal = student.email?.trim();
  if (personal && isValidLoginEmail(personal)) return personal.toLowerCase();
  return buildStudentLoginEmail(student.admissionNumber);
}

export function generateTemporaryPassword(length = 8): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += TEMP_PASSWORD_CHARS[bytes[i] % TEMP_PASSWORD_CHARS.length];
  }
  return out;
}

export function resolveStudentWhatsAppPhone(
  student: Pick<Student, 'whatsapp' | 'phone'>,
): string | null {
  const raw = student.whatsapp?.trim() || student.phone?.trim() || '';
  return raw || null;
}

export function buildStudentLoginWhatsAppMessage(input: {
  studentName: string;
  admissionNumber: string;
  email: string;
  temporaryPassword: string;
}): string {
  return [
    'Delta Gemunupura College — Student Portal',
    '',
    `Hello ${input.studentName},`,
    '',
    'Your student login has been created.',
    '',
    `Website: ${STUDENT_PORTAL_LOGIN_URL}`,
    `Username (email): ${input.email}`,
    `Temporary password: ${input.temporaryPassword}`,
    '',
    'Please sign in and create your own password when prompted.',
    '',
    `Admission No: ${input.admissionNumber}`,
    '',
    `Technical support — ${STUDENT_PORTAL_TECH_SUPPORT_NAME}: ${STUDENT_PORTAL_TECH_SUPPORT_PHONE}`,
  ].join('\n');
}

export function buildStudentLoginWhatsAppShareUrl(
  phone: string,
  message: string,
): string | null {
  const base = buildWhatsAppHref(phone);
  if (!base) return null;
  return `${base}?text=${encodeURIComponent(message)}`;
}
