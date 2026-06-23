import { describe, expect, it } from 'vitest';
import {
  isValidQuickPin,
  normalizeLinkedId,
  normalizeQuickPin,
  pinCredentialDocId,
  suggestQuickPinFromPhone,
} from './quick-pin';
import { hashQuickPin } from './pin-auth-server';

describe('quick-pin', () => {
  it('normalizes linked IDs', () => {
    expect(normalizeLinkedId(' adm 001 ')).toBe('ADM001');
  });

  it('validates PIN length and digits', () => {
    expect(isValidQuickPin('123')).toBe(false);
    expect(isValidQuickPin('1234')).toBe(true);
    expect(isValidQuickPin('12ab34')).toBe(true);
    expect(normalizeQuickPin('12-34')).toBe('1234');
    expect(isValidQuickPin('1234567')).toBe(false);
  });

  it('builds stable credential document IDs', () => {
    expect(pinCredentialDocId('student', 'adm001')).toBe('student_ADM001');
  });

  it('suggests PIN from phone tail', () => {
    expect(suggestQuickPinFromPhone('0771234567')).toBe('4567');
    expect(suggestQuickPinFromPhone('')).toBe('1234');
  });

  it('hashes PINs deterministically with test pepper', () => {
    process.env.QUICK_PIN_PEPPER = 'test-pepper';
    const a = hashQuickPin('1234', 'STF001', 'staff');
    const b = hashQuickPin('1234', 'STF001', 'staff');
    const c = hashQuickPin('5678', 'STF001', 'staff');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
