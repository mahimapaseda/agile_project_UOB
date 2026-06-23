import { AccountType } from '@/types';

export const PIN_CREDENTIALS_COLLECTION = 'pin_credentials';
export const QUICK_PIN_MIN_LENGTH = 4;
export const QUICK_PIN_MAX_LENGTH = 6;

export function normalizeLinkedId(linkedId: string): string {
  return linkedId.trim().toUpperCase().replace(/\s+/g, '');
}

export function normalizeQuickPin(pin: string): string {
  return pin.replace(/\D/g, '');
}

export function isValidQuickPin(pin: string): boolean {
  const digits = normalizeQuickPin(pin);
  return (
    digits.length >= QUICK_PIN_MIN_LENGTH &&
    digits.length <= QUICK_PIN_MAX_LENGTH &&
    /^\d+$/.test(digits)
  );
}

export function pinCredentialDocId(accountType: AccountType, linkedId: string): string {
  return `${accountType}_${normalizeLinkedId(linkedId)}`;
}

/** Default PIN for new accounts: last 4 digits of phone, or 1234 if unavailable. */
export function suggestQuickPinFromPhone(phone?: string | null): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length >= 4) return digits.slice(-4);
  return '1234';
}

export function quickPinKeyLabel(accountType: AccountType): string {
  if (accountType === 'staff') return 'Staff ID';
  return 'Admission number';
}
