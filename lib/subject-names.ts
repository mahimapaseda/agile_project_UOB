import {
  AL_STREAM_SUBJECTS,
  EXAM_CURRICULA,
  getSubjectsForExamination,
  isGrade10to11,
  isGrade12to13,
  normalizeALSubject,
  normalizeAestheticStudies10_11,
  normalizeBucketSubjectI,
  normalizeBucketSubjectIII,
} from './exam-subjects';
import { isAdvancedLevelGrade, resolveALStreamSubjectKey } from './grade-class-options';

export interface SubjectResolveOptions {
  grade?: string;
  section?: string;
  candidates?: readonly string[];
}

type AliasRule = {
  canonical: string;
  test: (value: string) => boolean;
};

/** Common spelling / shorthand → canonical curriculum names. */
const SUBJECT_ALIAS_RULES: AliasRule[] = [
  {
    canonical: 'Combined Mathematics',
    test: (v) => /comb(in(e|ed))?\s*math/i.test(v) || v.trim().toLowerCase() === 'comb. maths',
  },
  {
    canonical: 'Mathematics',
    test: (v) => /^(maths?|mathematics)$/i.test(v.trim()),
  },
  {
    canonical: 'Accounting',
    test: (v) => /^accounts?$/i.test(v.trim()) || /^accounting$/i.test(v.trim()),
  },
  {
    canonical: 'Business Studies',
    test: (v) =>
      /^business(\s*stud(ies|y))?$/i.test(v.trim()) || v.trim().toLowerCase() === 'business',
  },
  {
    canonical: 'Economics',
    test: (v) => /^econ(omics)?$/i.test(v.trim()),
  },
  {
    canonical: 'Physics',
    test: (v) => /^phys(ics)?$/i.test(v.trim()),
  },
  {
    canonical: 'Chemistry',
    test: (v) => /^chem(istry)?$/i.test(v.trim()),
  },
  {
    canonical: 'Biology',
    test: (v) => /^(bio|biology)$/i.test(v.trim()),
  },
  {
    canonical: 'Geography',
    test: (v) => /^geo(graphy)?$/i.test(v.trim()),
  },
  {
    canonical: 'Civic Education',
    test: (v) => /^civic(\s*ed(ucation)?)?$/i.test(v.trim()),
  },
  {
    canonical: 'ICT',
    test: (v) =>
      v.trim().toLowerCase() === 'ict' ||
      v.trim().toLowerCase() === 'it' ||
      /information technology/i.test(v) ||
      (v.toLowerCase().includes('information') && v.toLowerCase().includes('communication')),
  },
  {
    canonical: 'Agricultural Science',
    test: (v) =>
      /agricultural\s*science/i.test(v.trim()) ||
      /agri(cultur(e|al))\s*science/i.test(v.trim()),
  },
  {
    canonical: 'Agriculture',
    test: (v) => /^agri(cultur(e|al))?$/i.test(v.trim()) || v.trim().toLowerCase() === 'agri',
  },
  {
    canonical: 'Political Science',
    test: (v) => /^politic(s|al(\s*science)?)?$/i.test(v.trim()),
  },
  {
    canonical: 'Communication and Media Studies',
    test: (v) =>
      /communication\s*(and|&)\s*media/i.test(v.trim()) ||
      /media\s*(and|&)\s*communication/i.test(v.trim()),
  },
  {
    canonical: 'Art',
    test: (v) => /^arts?$/i.test(v.trim()),
  },
  {
    canonical: 'Sinhala',
    test: (v) => /^sinhala$/i.test(v.trim()),
  },
  {
    canonical: 'English',
    test: (v) => /^english$/i.test(v.trim()) || v.trim().toLowerCase() === 'eng',
  },
  {
    canonical: 'Tamil',
    test: (v) => /^tamil$/i.test(v.trim()),
  },
  {
    canonical: 'Science',
    test: (v) => /^science$/i.test(v.trim()) || v.trim().toLowerCase() === 'sci',
  },
  {
    canonical: 'History',
    test: (v) => /^hist(ory)?$/i.test(v.trim()),
  },
  {
    canonical: 'Commerce',
    test: (v) => /^commerce$/i.test(v.trim()),
  },
];

let cachedKnownSubjects: string[] | null = null;

export function getAllKnownCurriculumSubjects(): string[] {
  if (cachedKnownSubjects) return cachedKnownSubjects;

  const seen = new Set<string>();
  for (const curriculum of EXAM_CURRICULA) {
    for (const group of curriculum.groups) {
      for (const subject of group.subjects) seen.add(subject);
    }
  }
  for (const pool of Object.values(AL_STREAM_SUBJECTS)) {
    for (const subject of pool) seen.add(subject);
  }

  cachedKnownSubjects = [...seen];
  return cachedKnownSubjects;
}

export function subjectToken(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function aliasCanonical(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  for (const rule of SUBJECT_ALIAS_RULES) {
    if (rule.test(trimmed)) return rule.canonical;
  }
  return null;
}

function resolveWithGradeNormalizers(
  value: string,
  options?: SubjectResolveOptions,
): string | null {
  const grade = options?.grade;
  const section = options?.section;

  if (grade && isGrade12to13(grade)) {
    const streamKey = resolveALStreamSubjectKey(section);
    const al = normalizeALSubject(value, streamKey);
    if (al) return al;
  }

  if (grade && isGrade10to11(grade)) {
    return (
      normalizeBucketSubjectI(value) ??
      normalizeBucketSubjectIII(value) ??
      normalizeAestheticStudies10_11(value)
    );
  }

  if (grade && isAdvancedLevelGrade(grade)) {
    const streamKey = resolveALStreamSubjectKey(section);
    return normalizeALSubject(value, streamKey);
  }

  return null;
}

/** Match a raw label to a canonical subject from a candidate list. */
export function findSubjectInList(
  value: string,
  candidates: readonly string[],
): string | null {
  const trimmed = value.trim();
  if (!trimmed || !candidates.length) return null;

  const lower = trimmed.toLowerCase();
  const token = subjectToken(trimmed);

  for (const candidate of candidates) {
    if (candidate.toLowerCase() === lower) return candidate;
  }

  for (const candidate of candidates) {
    if (subjectToken(candidate) === token) return candidate;
  }

  const fromAlias = aliasCanonical(trimmed);
  if (fromAlias) {
    const exact = candidates.find((c) => c.toLowerCase() === fromAlias.toLowerCase());
    if (exact) return exact;
  }

  for (const candidate of candidates) {
    const cn = candidate.toLowerCase();
    if (cn === lower) return candidate;
    if (cn.includes(lower) || lower.includes(cn)) {
      if (Math.min(cn.length, lower.length) >= 4) return candidate;
    }
  }

  for (const candidate of candidates) {
    const alias = aliasCanonical(trimmed);
    if (alias && alias.toLowerCase() === candidate.toLowerCase()) return candidate;
  }

  return null;
}

/** Resolve shorthand / legacy labels (e.g. Account → Accounting). */
export function resolveCanonicalSubjectName(
  value: string | undefined | null,
  options?: SubjectResolveOptions,
): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();

  const fromGradeNormalizer = resolveWithGradeNormalizers(trimmed, options);
  if (fromGradeNormalizer) return fromGradeNormalizer;

  const gradeCandidates =
    options?.grade != null
      ? getSubjectsForExamination(options.grade, options.section)
      : [];
  const candidates = options?.candidates?.length
    ? options.candidates
    : gradeCandidates.length
      ? gradeCandidates
      : getAllKnownCurriculumSubjects();

  const fromList = findSubjectInList(trimmed, candidates);
  if (fromList) return fromList;

  const fromAlias = aliasCanonical(trimmed);
  if (fromAlias) {
    const known = getAllKnownCurriculumSubjects().find(
      (s) => s.toLowerCase() === fromAlias.toLowerCase(),
    );
    if (known) return known;
    return fromAlias;
  }

  const knownExact = getAllKnownCurriculumSubjects().find(
    (s) => s.toLowerCase() === trimmed.toLowerCase(),
  );
  return knownExact ?? trimmed;
}

export function subjectsMatch(
  a: string,
  b: string,
  options?: SubjectResolveOptions,
): boolean {
  const left = resolveCanonicalSubjectName(a, options);
  const right = resolveCanonicalSubjectName(b, options);
  if (!left || !right) return a.trim().toLowerCase() === b.trim().toLowerCase();
  return left.toLowerCase() === right.toLowerCase();
}

/** Normalize a list of subject labels (e.g. staff subjects taught). */
export function normalizeSubjectList(
  subjects: readonly string[],
  options?: SubjectResolveOptions,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const subject of subjects) {
    const canonical = resolveCanonicalSubjectName(subject, options) ?? subject.trim();
    const key = canonical.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(canonical);
  }
  return out;
}
