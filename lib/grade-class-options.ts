import { EXAM_CLASS_OPTIONS } from './examination-utils';

export type ALClassStreamOption = {
  value: string;
  label: string;
  hint?: string;
};

/** A/L streams for Grade 12 & 13 (replaces Class A, B, C). */
export const AL_CLASS_STREAM_OPTIONS: ALClassStreamOption[] = [
  {
    value: 'Science',
    label: 'Science',
    hint: 'Maths: Combined Maths · Physics · Chemistry · ICT · Bio: Biology · Chemistry · Physics · Agriculture',
  },
  { value: 'Commerce', label: 'Commerce', hint: 'Business Studies · Accounting · Economics · ICT' },
  {
    value: 'Arts',
    label: 'Arts',
    hint: 'Sinhala · Geography · Political Science · Communication and Media Studies · Home Science · Dancing · Music · Art · ICT · Agricultural Science · Economics',
  },
];

export const AL_CLASS_STREAM_VALUES = AL_CLASS_STREAM_OPTIONS.map((o) => o.value);

/** Legacy single-letter classes mapped to A/L streams when upgrading records. */
const LEGACY_LETTER_TO_AL_STREAM: Record<string, string> = {
  A: 'Science',
  B: 'Science',
  C: 'Commerce',
};

/** Google Form / CSV stream labels for Grade 12–13 imports. */
const CSV_AL_STREAM_ALIASES: Record<string, string> = {
  science: 'Science',
  maths: 'Science',
  math: 'Science',
  'science (maths)': 'Science',
  'physical science': 'Science',
  'physical science (maths)': 'Science',
  bio: 'Science',
  biology: 'Science',
  'science (bio)': 'Science',
  'biological science': 'Science',
  'biological science (bio)': 'Science',
  commerce: 'Commerce',
  arts: 'Arts',
};

/** Maps legacy stored stream names to the current canonical label. */
const LEGACY_STREAM_TO_CANONICAL: Record<string, string> = {
  'physical science (maths)': 'Science',
  'biological science (bio)': 'Science',
  'science (maths)': 'Science',
  'science (bio)': 'Science',
};

export function isAdvancedLevelGrade(grade: string): boolean {
  return grade === 'Grade 12' || grade === 'Grade 13';
}

/** Curriculum subject pool key for Grade 12–13 stream exams. */
export type ALStreamSubjectKey = 'commerce' | 'arts' | 'science';

/** Maps an A/L stream (exam section) to its subject pool. */
export function resolveALStreamSubjectKey(
  section: string | undefined | null,
): ALStreamSubjectKey | null {
  const stream = normalizeClassSection('Grade 12', section);
  if (!stream) return null;
  const lower = stream.toLowerCase();
  if (lower === 'commerce') return 'commerce';
  if (lower === 'arts') return 'arts';
  if (lower === 'science' || lower.includes('science') || lower.includes('maths') || lower.includes('bio')) {
    return 'science';
  }
  return null;
}

export function getClassOptionsForGrade(grade: string): ALClassStreamOption[] {
  if (isAdvancedLevelGrade(grade)) {
    return AL_CLASS_STREAM_OPTIONS.map((o) => ({ ...o }));
  }
  return EXAM_CLASS_OPTIONS.map((c) => ({ value: c, label: `Class ${c}` }));
}

export function getDefaultClassSection(grade: string): string {
  if (isAdvancedLevelGrade(grade)) return AL_CLASS_STREAM_VALUES[0];
  return 'A';
}

export function normalizeClassSection(grade: string, section: string | undefined | null): string {
  const raw = (section ?? '').trim();
  if (!raw) return '';
  if (!isAdvancedLevelGrade(grade)) return raw;

  if (raw.length === 1 && LEGACY_LETTER_TO_AL_STREAM[raw.toUpperCase()]) {
    return LEGACY_LETTER_TO_AL_STREAM[raw.toUpperCase()];
  }

  const lower = raw.toLowerCase();
  const alias = CSV_AL_STREAM_ALIASES[lower];
  if (alias) return alias;

  const legacy = LEGACY_STREAM_TO_CANONICAL[lower];
  if (legacy) return legacy;

  const match = AL_CLASS_STREAM_VALUES.find((v) => v.toLowerCase() === lower);
  return match ?? raw;
}

export function classSectionsMatch(
  grade: string,
  a: string | undefined | null,
  b: string | undefined | null,
): boolean {
  const na = normalizeClassSection(grade, a);
  const nb = normalizeClassSection(grade, b);
  if (!na || !nb) return false;
  if (!isAdvancedLevelGrade(grade)) {
    return na.toUpperCase() === nb.toUpperCase();
  }
  return na.toLowerCase() === nb.toLowerCase();
}

/** UI label: stream name for 12–13, "Class A" style for other grades. */
export function formatClassSection(grade: string, section?: string | null): string {
  const normalized = normalizeClassSection(grade, section);
  if (!normalized) return '';
  if (isAdvancedLevelGrade(grade)) return normalized;
  return `Class ${normalized}`;
}

export function getClassFieldLabel(grade: string): string {
  return isAdvancedLevelGrade(grade) ? 'Stream' : 'Class';
}

export function getClassFieldHint(grade: string): string {
  return isAdvancedLevelGrade(grade)
    ? 'Science (Maths or Bio track), Commerce, or Arts'
    : 'Class section e.g. A, B, C';
}
