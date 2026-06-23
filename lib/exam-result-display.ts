import type { ExamResult, SubjectResult } from '@/types';
import { calcSubjectGrade, isSubjectAbsent } from './exam-grading';
import { resolveCanonicalSubjectName, subjectsMatch } from './subject-names';

export function displaySubjectLabel(name: string): string {
  if (/food\s*tech/i.test(name)) return 'Agriculture';
  const short: Record<string, string> = {
    'Combined Mathematics': 'Comb. Maths',
    'Business Studies': 'Business',
    'Communication and Media Studies': 'Media',
    'Political Science': 'Pol. Science',
    'Agricultural Science': 'Agri. Science',
  };
  return short[name] ?? name;
}

export function buildSubjectColumns(results: ExamResult[], gradeSubjects: string[]): string[] {
  const ordered: string[] = [];
  const seen = new Set<string>();

  const remember = (subject: string) => {
    const canonical = resolveCanonicalSubjectName(subject) ?? subject.trim();
    const key = canonical.toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    ordered.push(canonical);
  };

  for (const subject of gradeSubjects) {
    if (results.some((r) => r.subjects.some((s) => subjectsMatch(s.subject, subject)))) {
      remember(subject);
    }
  }
  for (const r of results) {
    for (const s of r.subjects) {
      remember(s.subject);
    }
  }
  return ordered;
}

export function getSubjectMark(result: ExamResult, subject: string) {
  return result.subjects.find((s) => subjectsMatch(s.subject, subject));
}

export function formatSubjectMarkDisplay(sub: SubjectResult | undefined): string {
  if (!sub) return '—';
  if (isSubjectAbsent(sub)) return 'AB';
  return `${sub.obtainedMarks}/${sub.maxMarks}`;
}

export function formatSubjectMarkWithGrade(sub: SubjectResult | undefined): string {
  if (!sub) return '—';
  if (isSubjectAbsent(sub)) return 'AB';
  const grade = sub.grade?.trim() || calcSubjectGrade(sub.obtainedMarks, sub.maxMarks);
  return `${sub.obtainedMarks}/${sub.maxMarks} ${grade}`;
}
