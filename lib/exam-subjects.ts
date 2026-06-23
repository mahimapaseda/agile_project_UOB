import { Grade } from '@/types';
import {
  isAdvancedLevelGrade,
  resolveALStreamSubjectKey,
  type ALStreamSubjectKey,
} from '@/lib/grade-class-options';

/** Grades supported by the examinations module (Grade 6–13). */
export const EXAM_GRADES: Grade[] = [
  'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10',
  'Grade 11', 'Grade 12', 'Grade 13',
];

export type ExamGradeBand = 'grades_6_9' | 'grades_10_11' | 'grades_12_13';

/** Grade 6–9 elective group label (one dropdown on forms). */
export const AESTHETIC_STUDIES_LABEL = 'Aesthetic Studies';

export const AESTHETIC_STUDIES_OPTIONS = ['Art', 'Dancing', 'Music', 'Drama & Theatre'] as const;

export type AestheticStudyOption = (typeof AESTHETIC_STUDIES_OPTIONS)[number];

/** Grade 10–11 aesthetic elective options (one dropdown on result forms). */
export const AESTHETIC_STUDIES_10_11_OPTIONS = [
  'Dancing',
  'Music',
  'Arts',
  'Drama & Theatre',
] as const;

export type AestheticStudies10_11Option = (typeof AESTHETIC_STUDIES_10_11_OPTIONS)[number];

/** Grade 10–11 elective bucket (one dropdown on result forms). */
export const BUCKET_SUBJECT_I_LABEL = 'Bucket Subject I';

export const BUCKET_SUBJECT_I_OPTIONS = [
  'Geography',
  'Civic Education',
  'Commerce',
  'Entrepreneurship Studies',
  'Tamil',
] as const;

export type BucketSubjectIOption = (typeof BUCKET_SUBJECT_I_OPTIONS)[number];

/** Grade 10–11 vocational/technical bucket (one dropdown on result forms). */
export const BUCKET_SUBJECT_III_LABEL = 'Bucket Subject III';

export const BUCKET_SUBJECT_III_OPTIONS = [
  'ICT',
  'Home Economics',
  'Agriculture & Food Technology',
  'Health & Physical Education',
] as const;

export type BucketSubjectIIIOption = (typeof BUCKET_SUBJECT_III_OPTIONS)[number];

/** Number of A/L subjects each student sits for Grade 12–13 examinations. */
export const AL_SUBJECT_COUNT = 3;

export const COMMERCE_STREAM_SUBJECTS = [
  'Business Studies',
  'Accounting',
  'Economics',
  'ICT',
] as const;

export const ARTS_STREAM_SUBJECTS = [
  'Sinhala',
  'Geography',
  'Political Science',
  'Communication and Media Studies',
  'Home Science',
  'Dancing',
  'Music',
  'Art',
  'ICT',
  'Agricultural Science',
  'Economics',
] as const;

/** Science (Maths track) — pick 3 from these 4 subjects. */
export const SCIENCE_MATHS_STREAM_SUBJECTS = [
  'Combined Mathematics',
  'Physics',
  'Chemistry',
  'ICT',
] as const;

/** Science (Bio track) — pick 3 from these 4 subjects. */
export const SCIENCE_BIO_STREAM_SUBJECTS = [
  'Biology',
  'Chemistry',
  'Physics',
  'Agriculture',
] as const;

/** All Science stream subjects (Maths + Bio tracks) for exams and CSV columns. */
export const SCIENCE_STREAM_SUBJECTS = [
  'Combined Mathematics',
  'Physics',
  'Chemistry',
  'ICT',
  'Biology',
  'Agriculture',
] as const;

export const AL_STREAM_SUBJECTS: Record<ALStreamSubjectKey, readonly string[]> = {
  commerce: COMMERCE_STREAM_SUBJECTS,
  arts: ARTS_STREAM_SUBJECTS,
  science: SCIENCE_STREAM_SUBJECTS,
};

/** True when exactly 3 subjects are all from the Maths track or all from the Bio track. */
export function isValidScienceALSubjectSet(subjects: string[]): boolean {
  if (subjects.length !== AL_SUBJECT_COUNT) return false;
  const maths = new Set<string>(SCIENCE_MATHS_STREAM_SUBJECTS);
  const bio = new Set<string>(SCIENCE_BIO_STREAM_SUBJECTS);
  return subjects.every((s) => maths.has(s)) || subjects.every((s) => bio.has(s));
}

export interface ExamSubjectGroup {
  title: string;
  description?: string;
  /** Individual subject names in this group. */
  subjects: string[];
  /** Student picks one subject from this group (e.g. Aesthetic Studies). */
  selectOne?: boolean;
  /** Shown when curriculum is not yet finalised. */
  pending?: boolean;
}

export interface ExamCurriculum {
  band: ExamGradeBand;
  label: string;
  gradeRange: string;
  grades: Grade[];
  groups: ExamSubjectGroup[];
}

export const EXAM_CURRICULA: ExamCurriculum[] = [
  {
    band: 'grades_6_9',
    label: 'Grade 6 to 9',
    gradeRange: 'Grade 6 to 9',
    grades: ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'],
    groups: [
      {
        title: 'Core subjects',
        subjects: [
          'Sinhala',
          'Buddhism',
          'Mathematics',
          'Science',
          'History',
          'Geography',
          'Civic Education',
          'Health and Physical Education',
          'ICT',
          'Practical & Technical Skills',
          'English',
          'Tamil',
        ],
      },
      {
        title: AESTHETIC_STUDIES_LABEL,
        description: 'Select one from the dropdown',
        selectOne: true,
        subjects: [...AESTHETIC_STUDIES_OPTIONS],
      },
    ],
  },
  {
    band: 'grades_10_11',
    label: 'Grade 10 – 11',
    gradeRange: 'Grades 10 to 11',
    grades: ['Grade 10', 'Grade 11'],
    groups: [
      {
        title: 'Core subjects',
        subjects: ['Sinhala', 'Mathematics', 'Science', 'English', 'History', 'Buddhism'],
      },
      {
        title: BUCKET_SUBJECT_I_LABEL,
        description: 'Select one from the dropdown',
        selectOne: true,
        subjects: [...BUCKET_SUBJECT_I_OPTIONS],
      },
      {
        title: AESTHETIC_STUDIES_LABEL,
        description: 'Select one from the dropdown',
        selectOne: true,
        subjects: [...AESTHETIC_STUDIES_10_11_OPTIONS],
      },
      {
        title: BUCKET_SUBJECT_III_LABEL,
        description: 'Select one from the dropdown',
        selectOne: true,
        subjects: [...BUCKET_SUBJECT_III_OPTIONS],
      },
    ],
  },
  {
    band: 'grades_12_13',
    label: 'Grade 12 – 13 (A/L)',
    gradeRange: 'Grades 12 to 13',
    grades: ['Grade 12', 'Grade 13'],
    groups: [
      {
        title: 'Science Stream',
        description:
          'Maths track: Combined Mathematics, Physics, Chemistry, ICT · Bio track: Biology, Chemistry, Physics, Agriculture — pick 3',
        subjects: [...SCIENCE_STREAM_SUBJECTS],
      },
      {
        title: 'Commerce Stream',
        description: 'Pick 3 subjects',
        subjects: [...COMMERCE_STREAM_SUBJECTS],
      },
      {
        title: 'Arts Stream',
        description: 'Pick 3 subjects',
        subjects: [...ARTS_STREAM_SUBJECTS],
      },
    ],
  },
];

const GRADE_TO_BAND: Record<string, ExamGradeBand> = {
  'Grade 6': 'grades_6_9',
  'Grade 7': 'grades_6_9',
  'Grade 8': 'grades_6_9',
  'Grade 9': 'grades_6_9',
  'Grade 10': 'grades_10_11',
  'Grade 11': 'grades_10_11',
  'Grade 12': 'grades_12_13',
  'Grade 13': 'grades_12_13',
};

export function getExamGradeBand(grade: string): ExamGradeBand | null {
  return GRADE_TO_BAND[grade] ?? null;
}

export function isGrade6to9(grade: string): boolean {
  return getExamGradeBand(grade) === 'grades_6_9';
}

export function isGrade10to11(grade: string): boolean {
  return getExamGradeBand(grade) === 'grades_10_11';
}

export function isGrade12to13(grade: string): boolean {
  return isAdvancedLevelGrade(grade);
}

export function getALStreamSubjects(streamKey: ALStreamSubjectKey): string[] {
  return [...AL_STREAM_SUBJECTS[streamKey]];
}

/** Match a label to a canonical A/L subject within an optional stream pool. */
export function normalizeALSubject(
  value: string | undefined | null,
  streamKey?: ALStreamSubjectKey | null,
): string | null {
  if (!value?.trim()) return null;
  const raw = value.trim();
  const v = raw.toLowerCase();

  const pools = streamKey
    ? [AL_STREAM_SUBJECTS[streamKey]]
    : (Object.values(AL_STREAM_SUBJECTS) as readonly (readonly string[])[]);

  const findInPools = (canonical: string): string | null => {
    for (const pool of pools) {
      if (pool.includes(canonical)) return canonical;
    }
    return null;
  };

  for (const pool of pools) {
    const exact = pool.find((s) => s.toLowerCase() === v);
    if (exact) return exact;
  }

  if ((v.includes('combine') || v.includes('combined')) && v.includes('math')) {
    return findInPools('Combined Mathematics');
  }
  if (v.includes('business') && v.includes('stud')) return findInPools('Business Studies');
  if (v.includes('account')) return findInPools('Accounting');
  if (v.includes('econom')) return findInPools('Economics');
  if (v.includes('physic')) return findInPools('Physics');
  if (v.includes('chemist')) return findInPools('Chemistry');
  if (v.includes('biolog') || v === 'bio') return findInPools('Biology');
  if (v.includes('geograph')) return findInPools('Geography');
  if (v.includes('politic')) return findInPools('Political Science');
  if (
    (v.includes('media') && v.includes('comm')) ||
    v.includes('communication and media')
  ) {
    return findInPools('Communication and Media Studies');
  }
  if (v.includes('home') && v.includes('sci')) return findInPools('Home Science');
  if (v.includes('danc')) return findInPools('Dancing');
  if (v.includes('music')) return findInPools('Music');
  if (v === 'arts' || v === 'art') return findInPools('Art');
  if (v.includes('sinhala')) return findInPools('Sinhala');
  // Arts: Agricultural Science · Science (Bio): Agriculture — not Grade 10–11 bucket names.
  if (
    v === 'agriculture' ||
    v.includes('agricultur') ||
    (v.includes('food') && v.includes('tech'))
  ) {
    return findInPools('Agricultural Science') ?? findInPools('Agriculture');
  }

  if (
    v === 'ict' ||
    v === 'it' ||
    v.includes('information technology') ||
    (v.includes('information') && v.includes('communication'))
  ) {
    return findInPools('ICT');
  }

  return null;
}

/** Parse comma-separated A/L subject choices from a student profile field. */
export function parseALSubjectsFromProfile(
  value: string | undefined | null,
  streamKey?: ALStreamSubjectKey | null,
): string[] {
  if (!value?.trim()) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of value.split(/[,;/]+/)) {
    const subject = normalizeALSubject(part, streamKey);
    if (subject && !seen.has(subject)) {
      seen.add(subject);
      out.push(subject);
    }
  }
  return out;
}

/** Subjects available for a specific examination (stream-aware for Grade 12–13). */
export function getSubjectsForExamination(grade: string, section?: string): string[] {
  if (isAdvancedLevelGrade(grade)) {
    const streamKey = resolveALStreamSubjectKey(section);
    if (!streamKey) return [];
    return getALStreamSubjects(streamKey);
  }
  return getSubjectsForGrade(grade);
}

export function getSelectOneGroupsForGrade(grade: string): ExamSubjectGroup[] {
  const curriculum = getCurriculumForGrade(grade);
  if (!curriculum) return [];
  return curriculum.groups.filter((g) => g.selectOne && !g.pending);
}

/** @deprecated Use getSelectOneGroupsForGrade — returns the first select-one group only. */
export function getSelectOneGroupForGrade(grade: string): ExamSubjectGroup | null {
  return getSelectOneGroupsForGrade(grade)[0] ?? null;
}

export function getSelectOneOptionsForGrade(grade: string): string[] {
  return getSelectOneGroupsForGrade(grade).flatMap((g) => [...g.subjects]);
}

/** CSV import column for the chosen elective (before the mark column). */
export function getSelectOneChoiceColumnForGroup(groupTitle: string): string | null {
  if (groupTitle === BUCKET_SUBJECT_I_LABEL) return 'Bucket Subject';
  if (groupTitle === BUCKET_SUBJECT_III_LABEL) return 'Bucket III Subject';
  if (groupTitle === AESTHETIC_STUDIES_LABEL) return 'Aesthetic Subject';
  return null;
}

/** @deprecated Use getSelectOneChoiceColumnForGroup */
export function getSelectOneChoiceColumn(grade: string): string | null {
  const groups = getSelectOneGroupsForGrade(grade);
  if (groups.length === 0) return null;
  return getSelectOneChoiceColumnForGroup(groups[0].title);
}

export function normalizeAestheticSubject(value: string | undefined | null): AestheticStudyOption | null {
  if (!value?.trim()) return null;
  const v = value.trim().toLowerCase();
  for (const opt of AESTHETIC_STUDIES_OPTIONS) {
    if (opt.toLowerCase() === v) return opt;
  }
  if (v.includes('drama') || v.includes('theatre') || v.includes('theater')) return 'Drama & Theatre';
  if (v.includes('danc')) return 'Dancing';
  if (v === 'art' || v === 'arts') return 'Art';
  if (v.includes('music')) return 'Music';
  return null;
}

/** Maps legacy labels to a Grade 10–11 Aesthetic Studies option. */
export function normalizeAestheticStudies10_11(
  value: string | undefined | null,
): AestheticStudies10_11Option | null {
  if (!value?.trim()) return null;
  const v = value.trim().toLowerCase();
  for (const opt of AESTHETIC_STUDIES_10_11_OPTIONS) {
    if (opt.toLowerCase() === v) return opt;
  }
  if (v.includes('drama') || v.includes('theatre') || v.includes('theater')) return 'Drama & Theatre';
  if (v.includes('danc')) return 'Dancing';
  if (v.includes('music')) return 'Music';
  if (v === 'arts' || v === 'art') return 'Arts';
  return null;
}

export function normalizeSubjectForSelectOneGroup(
  grade: string,
  groupTitle: string,
  value: string | undefined | null,
): string | null {
  if (groupTitle === BUCKET_SUBJECT_I_LABEL) return normalizeBucketSubjectI(value);
  if (groupTitle === BUCKET_SUBJECT_III_LABEL) return normalizeBucketSubjectIII(value);
  if (groupTitle === AESTHETIC_STUDIES_LABEL) {
    if (isGrade6to9(grade)) return normalizeAestheticSubject(value);
    return normalizeAestheticStudies10_11(value);
  }
  const group = getSelectOneGroupsForGrade(grade).find((g) => g.title === groupTitle);
  if (!group || !value?.trim()) return null;
  const trimmed = value.trim();
  const exact = group.subjects.find((s) => s.toLowerCase() === trimmed.toLowerCase());
  if (exact) return exact;
  const v = trimmed.toLowerCase();
  if (/^accounts?$/.test(v)) {
    return group.subjects.find((s) => s.toLowerCase() === 'accounting') ?? null;
  }
  return group.subjects.find((s) => {
    const sn = s.toLowerCase();
    return sn.includes(v) || v.includes(sn);
  }) ?? null;
}

export function findSelectOneGroupForSubject(
  grade: string,
  subject: string | undefined | null,
): ExamSubjectGroup | null {
  if (!subject?.trim()) return null;
  for (const group of getSelectOneGroupsForGrade(grade)) {
    if (normalizeSubjectForSelectOneGroup(grade, group.title, subject)) return group;
  }
  return null;
}

/** Maps legacy label and aliases to a Bucket Subject I option. */
export function normalizeBucketSubjectI(value: string | undefined | null): BucketSubjectIOption | null {
  if (!value?.trim()) return null;
  const v = value.trim().toLowerCase();
  if (
    (v.includes('business') && v.includes('accounting')) ||
    v === 'business & accounting studies' ||
    v === 'business and accounting studies'
  ) {
    return 'Commerce';
  }
  for (const opt of BUCKET_SUBJECT_I_OPTIONS) {
    if (opt.toLowerCase() === v) return opt;
  }
  if (v.includes('geograph')) return 'Geography';
  if (v.includes('civic')) return 'Civic Education';
  if (v === 'commerce' || v.includes('commerce')) return 'Commerce';
  if (v.includes('entrepreneur')) return 'Entrepreneurship Studies';
  if (
    v === 'tamil' ||
    v.includes('second language') ||
    (v.includes('tamil') && v.includes('english'))
  ) {
    return 'Tamil';
  }
  return null;
}

/** Maps legacy labels to a Bucket Subject III option. */
export function normalizeBucketSubjectIII(
  value: string | undefined | null,
): BucketSubjectIIIOption | null {
  if (!value?.trim()) return null;
  const v = value.trim().toLowerCase();
  for (const opt of BUCKET_SUBJECT_III_OPTIONS) {
    if (opt.toLowerCase() === v) return opt;
  }
  if (v === 'ict' || v.includes('information') && v.includes('communication')) return 'ICT';
  if (v.includes('home econ')) return 'Home Economics';
  if (v.includes('food tech') || (v.includes('agriculture') && v.includes('food'))) {
    return 'Agriculture & Food Technology';
  }
  if (
    v.includes('health') &&
    (v.includes('physical') || v.includes('pe') || v.includes('p.e'))
  ) {
    return 'Health & Physical Education';
  }
  return null;
}

export function normalizeSelectOneSubject(
  grade: string,
  value: string | undefined | null,
): string | null {
  if (!value?.trim()) return null;
  for (const group of getSelectOneGroupsForGrade(grade)) {
    const match = normalizeSubjectForSelectOneGroup(grade, group.title, value);
    if (match) return match;
  }
  return null;
}

export function getCurriculumForGrade(grade: string): ExamCurriculum | null {
  const band = getExamGradeBand(grade);
  if (!band) return null;
  return EXAM_CURRICULA.find((c) => c.band === band) ?? null;
}

export function getCurriculumForBand(band: ExamGradeBand): ExamCurriculum {
  return EXAM_CURRICULA.find((c) => c.band === band)!;
}

/** Flat, deduplicated subject list for result entry dropdowns. */
export function getSubjectsForGrade(grade: string): string[] {
  const curriculum = getCurriculumForGrade(grade);
  if (!curriculum) return [];

  const seen = new Set<string>();
  const out: string[] = [];
  for (const group of curriculum.groups) {
    if (group.pending) continue;
    for (const subject of group.subjects) {
      if (!seen.has(subject)) {
        seen.add(subject);
        out.push(subject);
      }
    }
  }
  return out;
}

/** Core (non-elective) subjects — excludes select-one groups. */
export function getCoreSubjectsForGrade(grade: string): string[] {
  const curriculum = getCurriculumForGrade(grade);
  if (!curriculum) return [];

  const seen = new Set<string>();
  const out: string[] = [];
  for (const group of curriculum.groups) {
    if (group.pending || group.selectOne) continue;
    for (const subject of group.subjects) {
      if (!seen.has(subject)) {
        seen.add(subject);
        out.push(subject);
      }
    }
  }
  return out;
}

/** UI list: one row for Aesthetic Studies, not four separate subjects. */
export function getSubjectsForDisplay(grade: string): string[] {
  const curriculum = getCurriculumForGrade(grade);
  if (!curriculum) return [];

  const out: string[] = [];
  for (const group of curriculum.groups) {
    if (group.pending) continue;
    if (group.selectOne) {
      out.push(group.title);
      continue;
    }
    for (const subject of group.subjects) {
      out.push(subject);
    }
  }
  return out;
}

export function countCurriculumSubjects(grade: string, _section?: string): number {
  if (isAdvancedLevelGrade(grade)) return AL_SUBJECT_COUNT;
  const selectOneGroups = getSelectOneGroupsForGrade(grade);
  if (selectOneGroups.length > 0) {
    return getCoreSubjectsForGrade(grade).length + selectOneGroups.length;
  }
  return getSubjectsForGrade(grade).length;
}

export function getSubjectsForGradeStudent(
  grade: string,
  electiveChoice?: string,
): string[] {
  const selectOneGroups = getSelectOneGroupsForGrade(grade);
  if (selectOneGroups.length === 0) return getSubjectsForGrade(grade);

  const core = getCoreSubjectsForGrade(grade);
  const choice = normalizeSelectOneSubject(grade, electiveChoice);
  if (choice) return [...core, choice];
  return [...core, ...getSelectOneOptionsForGrade(grade)];
}

export function getExamResultCsvColumns(grade: string, section?: string): string[] {
  if (isAdvancedLevelGrade(grade)) {
    return getSubjectsForExamination(grade, section);
  }
  const selectOneGroups = getSelectOneGroupsForGrade(grade);
  if (selectOneGroups.length > 0) {
    return [
      ...getCoreSubjectsForGrade(grade),
      ...selectOneGroups.map((g) => g.title),
    ];
  }
  return getSubjectsForGrade(grade);
}

export function isExamGrade(grade: string): grade is Grade {
  return (EXAM_GRADES as string[]).includes(grade);
}
