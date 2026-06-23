/** Strip to digits for tel / WhatsApp deep links. */
export function normalizePhoneDigits(raw: string): string {
  return raw.replace(/\D/g, '');
}

/** Sri Lanka WhatsApp: 077… → 9477… for wa.me links. */
export function toWhatsAppPhoneDigits(raw: string): string | null {
  let digits = normalizePhoneDigits(raw);
  if (!digits) return null;
  if (digits.startsWith('0')) digits = `94${digits.slice(1)}`;
  else if (!digits.startsWith('94') && digits.length <= 10) digits = `94${digits}`;
  return digits.length >= 11 ? digits : null;
}

export function buildTelHref(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const digits = normalizePhoneDigits(trimmed);
  if (digits.length < 9) return null;
  if (trimmed.startsWith('+')) return `tel:${trimmed.replace(/\s/g, '')}`;
  return `tel:${digits}`;
}

/** Opens WhatsApp app on mobile when installed (PWA / home screen). */
export function buildWhatsAppHref(raw: string): string | null {
  const digits = toWhatsAppPhoneDigits(raw);
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}

/** Opens default mail app (Gmail, Outlook, etc.) on mobile and desktop. */
export function buildMailtoHref(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null;
  return `mailto:${trimmed}`;
}
