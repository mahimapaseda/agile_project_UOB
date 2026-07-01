/** First index number used when no students exist yet. */
export const DEFAULT_STUDENT_INDEX = '1234';

const DEFAULT_STUDENT_INDEX_NUM = 1234;

/** True when the value is a plain numeric index (e.g. 1234). */
export function isNumericStudentIndex(value: string): boolean {
  return /^\d+$/.test(value.trim());
}

/** Extract a numeric index from plain digits or legacy prefixed IDs (e.g. ADM260001 → 260001). */
export function parseStudentIndexNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : null;
}

/** Next available index — starts at 1234, then max(existing numeric) + 1. */
export function suggestNextStudentIndexNumber(existingAdmissionNumbers: string[]): string {
  let max = DEFAULT_STUDENT_INDEX_NUM - 1;
  for (const raw of existingAdmissionNumbers) {
    const n = parseStudentIndexNumber(raw);
    if (n !== null) max = Math.max(max, n);
  }
  return String(max + 1);
}
