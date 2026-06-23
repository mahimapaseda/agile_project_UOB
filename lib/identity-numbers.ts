/**
 * NIC / index numbers from CSV or Excel often arrive as scientific notation (e.g. 2.00903E+11).
 * Always store and display them as plain digit strings.
 */

const SCIENTIFIC = /^[+-]?(?:\d+\.?\d*|\.\d+)[eE][+-]?\d+$/;

/** Convert Excel/Sheets scientific notation to a full integer string when possible. */
function expandScientificNotation(value: string): string {
  const trimmed = value.trim();
  if (!SCIENTIFIC.test(trimmed)) return trimmed;

  const match = trimmed.match(/^([+-]?)(\d(?:\.\d+)?)[eE]([+-]?\d+)$/);
  if (!match) return trimmed;

  const sign = match[1] === '-' ? '-' : '';
  const mantissa = match[2];
  const exponent = parseInt(match[3], 10);
  if (!Number.isFinite(exponent)) return trimmed;

  const parts = mantissa.split('.');
  const intPart = parts[0] ?? '';
  const fracPart = parts[1] ?? '';
  const digits = intPart + fracPart;
  const decimalPos = intPart.length;
  const newPos = decimalPos + exponent;

  if (newPos <= 0) {
    return `${sign}0.${'0'.repeat(-newPos)}${digits.replace(/^0+/, '') || '0'}`;
  }
  if (newPos >= digits.length) {
    return `${sign}${digits}${'0'.repeat(newPos - digits.length)}`;
  }
  return `${sign}${digits.slice(0, newPos)}.${digits.slice(newPos)}`.replace(/\.$/, '');
}

/**
 * Normalize Sri Lankan NIC, parent NIC, or similar long numeric IDs from imports.
 * Preserves old-format NIC with trailing V/X.
 */
export function normalizeIdentityNumber(value: string | null | undefined): string | undefined {
  if (value === undefined || value === null) return undefined;

  let v = String(value).trim();
  if (!v) return undefined;

  v = v.replace(/\s+/g, '');

  const oldNic = v.match(/^(\d{9})([vVxX])$/);
  if (oldNic) return `${oldNic[1]}${oldNic[2].toUpperCase()}`;

  if (SCIENTIFIC.test(v)) {
    v = expandScientificNotation(v);
  }

  if (/^\d+\.\d+$/.test(v)) {
    const asNum = Number(v);
    if (Number.isFinite(asNum) && asNum >= 1e9 && asNum < 1e16 && Math.abs(asNum - Math.round(asNum)) < 1e-6) {
      v = String(Math.round(asNum));
    } else {
      v = v.replace(/\.0+$/, '').replace(/\.$/, '');
    }
  }

  if (/^\d+$/.test(v)) {
    return v.replace(/^0+(?=\d)/, '') || '0';
  }

  return v;
}

/** Display helper — fixes values already saved in scientific notation. */
export function formatIdentityNumber(value: string | null | undefined): string {
  const normalized = normalizeIdentityNumber(value);
  if (!normalized) return '—';
  return normalized;
}
