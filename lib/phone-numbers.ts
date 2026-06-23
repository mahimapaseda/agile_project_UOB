import { normalizePhoneDigits } from './contact-links';

/** Validate Sri Lanka mobile numbers (07…, +94…, 94…). */
export function isValidSriLankaMobile(raw: string): boolean {
  const digits = normalizePhoneDigits(raw);
  if (!digits) return false;
  if (digits.startsWith('94')) return digits.length === 11 || digits.length === 12;
  if (digits.startsWith('0')) return digits.length === 10;
  return digits.length >= 9 && digits.length <= 10;
}

/** Store/display as local 0XXXXXXXXX when possible. */
export function formatLocalMobile(raw: string): string {
  let digits = normalizePhoneDigits(raw);
  if (!digits) return '';
  if (digits.startsWith('94')) digits = `0${digits.slice(2)}`;
  else if (!digits.startsWith('0') && digits.length === 9) digits = `0${digits}`;
  return digits;
}
