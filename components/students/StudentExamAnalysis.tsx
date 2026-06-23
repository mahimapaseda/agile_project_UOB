'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Award,
  TrendingUp,
  TrendingDown,
  Minus,
  BookOpen,
  ChevronDown,
  Search,
  CalendarDays,
  Filter,
  X,
} from 'lucide-react';
import { ExamResult } from '@/types';
import { getLetterGrade, getResultLetterGrade } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface StudentExamAnalysisProps {
  results: ExamResult[];
  className?: string;
}

const LETTER_ORDER = ['A', 'B', 'C', 'S', 'F'] as const;

const LETTER_STYLES: Record<string, { bar: string; text: string; bg: string }> = {
  A: { bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  B: { bar: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' },
  C: { bar: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
  S: { bar: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50' },
  F: { bar: 'bg-rose-500', text: 'text-rose-700', bg: 'bg-rose-50' },
  W: { bar: 'bg-rose-500', text: 'text-rose-700', bg: 'bg-rose-50' },
};

function pctColor(pct: number): string {
  if (pct >= 75) return 'text-emerald-700';
  if (pct >= 65) return 'text-blue-700';
  if (pct >= 50) return 'text-amber-700';
  if (pct >= 35) return 'text-orange-700';
  return 'text-rose-700';
}

function pctBar(pct: number): string {
  if (pct >= 75) return 'bg-emerald-500';
  if (pct >= 65) return 'bg-blue-500';
  if (pct >= 50) return 'bg-amber-500';
  if (pct >= 35) return 'bg-orange-500';
  return 'bg-rose-500';
}

type SubjectExamPoint = {
  examId: string;
  examName: string;
  term: string;
  year: number;
  percentage: number;
  obtained: number;
  max: number;
  grade: string;
};

type SubjectAnalysis = {
  subject: string;
  points: SubjectExamPoint[];
  average: number;
  best: SubjectExamPoint;
  lowest: SubjectExamPoint;
  latest: SubjectExamPoint;
  trend: number | null;
  grade: string;
  examsTaken: number;
};

function letterFor(grade: string, pct: number): string {
  const normalized = grade.trim().toUpperCase() === 'W' ? 'F' : grade.trim().toUpperCase();
  if (LETTER_ORDER.includes(normalized as (typeof LETTER_ORDER)[number])) return normalized;
  return getLetterGrade(pct);
}

export function StudentExamAnalysis({ results, className }: StudentExamAnalysisProps) {
  const [query, setQuery] = useState('');
  const [openSubject, setOpenSubject] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'top' | 'low' | 'name'>('top');
  const [termFilter, setTermFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');

  // Distinct filter options derived from all results.
  const filterOptions = useMemo(() => {
    const years = new Set<number>();
    const terms = new Set<string>();
    const subs = new Set<string>();
    for (const r of results) {
      if (r.year != null) years.add(r.year);
      if (r.term) terms.add(r.term);
      for (const s of r.subjects) subs.add(s.subject);
    }
    return {
      years: [...years].sort((a, b) => b - a),
      terms: [...terms].sort((a, b) => a.localeCompare(b)),
      subjects: [...subs].sort((a, b) => a.localeCompare(b)),
    };
  }, [results]);

  // Apply term/year filters to the underlying exam results.
  const filteredResults = useMemo(() => {
    return results.filter((r) => {
      if (termFilter !== 'all' && r.term !== termFilter) return false;
      if (yearFilter !== 'all' && String(r.year) !== yearFilter) return false;
      return true;
    });
  }, [results, termFilter, yearFilter]);

  const overview = useMemo(() => {
    if (filteredResults.length === 0) return null;

    const chronological = [...filteredResults].sort((a, b) => {
      const ya = a.year ?? 0;
      const yb = b.year ?? 0;
      if (ya !== yb) return ya - yb;
      return (a.term ?? '').localeCompare(b.term ?? '');
    });

    const average =
      filteredResults.reduce((s, r) => s + r.percentage, 0) / filteredResults.length;
    const allSubjects = filteredResults.flatMap((r) => r.subjects);
    const overallGrade = getResultLetterGrade(average, allSubjects);
    const best = [...filteredResults].sort((a, b) => b.percentage - a.percentage)[0];
    const latest = chronological[chronological.length - 1];
    const previous = chronological.length > 1 ? chronological[chronological.length - 2] : null;
    const trend = previous ? latest.percentage - previous.percentage : null;

    return { chronological, average, overallGrade, best, latest, trend };
  }, [filteredResults]);

  const subjects = useMemo<SubjectAnalysis[]>(() => {
    if (filteredResults.length === 0) return [];

    const chronological = [...filteredResults].sort((a, b) => {
      const ya = a.year ?? 0;
      const yb = b.year ?? 0;
      if (ya !== yb) return ya - yb;
      return (a.term ?? '').localeCompare(b.term ?? '');
    });

    const map = new Map<string, SubjectExamPoint[]>();
    for (const r of chronological) {
      for (const s of r.subjects) {
        const pct = s.maxMarks > 0 ? (s.obtainedMarks / s.maxMarks) * 100 : 0;
        const point: SubjectExamPoint = {
          examId: r.id,
          examName: r.examName,
          term: r.term,
          year: r.year,
          percentage: pct,
          obtained: s.obtainedMarks,
          max: s.maxMarks,
          grade: letterFor(s.grade, pct),
        };
        const list = map.get(s.subject) ?? [];
        list.push(point);
        map.set(s.subject, list);
      }
    }

    return [...map.entries()]
      .map(([subject, points]) => {
        const average =
          points.reduce((sum, p) => sum + p.percentage, 0) / Math.max(1, points.length);
        const best = [...points].sort((a, b) => b.percentage - a.percentage)[0];
        const lowest = [...points].sort((a, b) => a.percentage - b.percentage)[0];
        const latest = points[points.length - 1];
        const previous = points.length > 1 ? points[points.length - 2] : null;
        const trend = previous ? latest.percentage - previous.percentage : null;
        return {
          subject,
          points,
          average,
          best,
          lowest,
          latest,
          trend,
          grade: getLetterGrade(average),
          examsTaken: points.length,
        };
      })
      .sort((a, b) => b.average - a.average);
  }, [filteredResults]);

  useEffect(() => {
    setOpenSubject(null);
  }, [sortBy, query, subjectFilter, termFilter, yearFilter]);

  const filteredSubjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = subjects;
    if (subjectFilter !== 'all') list = list.filter((s) => s.subject === subjectFilter);
    if (q) list = list.filter((s) => s.subject.toLowerCase().includes(q));
    if (sortBy === 'low') list = [...list].sort((a, b) => a.average - b.average);
    else if (sortBy === 'name') list = [...list].sort((a, b) => a.subject.localeCompare(b.subject));
    else list = [...list].sort((a, b) => b.average - a.average);
    return list;
  }, [subjects, query, sortBy, subjectFilter]);

  const hasActiveFilters =
    termFilter !== 'all' || yearFilter !== 'all' || subjectFilter !== 'all' || query.trim() !== '';

  const clearFilters = () => {
    setTermFilter('all');
    setYearFilter('all');
    setSubjectFilter('all');
    setQuery('');
  };

  const strongest = subjects[0] ?? null;
  const weakest = subjects.length > 1 ? subjects[subjects.length - 1] : null;

  if (results.length === 0) {
    return (
      <section
        className={cn(
          'overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm',
          className
        )}
      >
        <div className="flex flex-col items-center justify-center gap-2 px-4 py-16 text-center">
          <Award className="h-9 w-9 text-slate-300" />
          <p className="text-base font-medium text-slate-600">No exam results recorded yet</p>
          <p className="text-sm text-slate-400">Subject analysis will appear once results are added.</p>
        </div>
      </section>
    );
  }

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col gap-2', className)}>
      {/* Filters + compact stats — fixed height */}
      <div className="shrink-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 shadow-sm">
          <Filter className="hidden h-4 w-4 shrink-0 text-slate-400 sm:block" />
          <FilterSelect
            label="Year"
            value={yearFilter}
            onChange={setYearFilter}
            options={[
              { value: 'all', label: 'All years' },
              ...filterOptions.years.map((y) => ({ value: String(y), label: String(y) })),
            ]}
          />
          <FilterSelect
            label="Term"
            value={termFilter}
            onChange={setTermFilter}
            options={[
              { value: 'all', label: 'All terms' },
              ...filterOptions.terms.map((t) => ({ value: t, label: t })),
            ]}
          />
          <FilterSelect
            label="Subject"
            value={subjectFilter}
            onChange={setSubjectFilter}
            options={[
              { value: 'all', label: 'All subjects' },
              ...filterOptions.subjects.map((s) => ({ value: s, label: s })),
            ]}
          />
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 px-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-50"
            >
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          )}
        </div>

        {overview && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 shadow-sm">
            <CircularGauge value={overview.average} grade={overview.overallGrade} size="sm" />
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="font-semibold text-slate-700">
                Avg <strong className="text-slate-900">{overview.average.toFixed(1)}%</strong>
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-600">
                Best <strong className="text-emerald-700">{overview.best.percentage.toFixed(0)}%</strong>
              </span>
              <span className="text-slate-300">|</span>
              <TrendPill trend={overview.trend} />
              {strongest && (
                <>
                  <span className="text-slate-300">|</span>
                  <span className="truncate text-emerald-700" title={strongest.subject}>
                    ↑ {strongest.subject}
                  </span>
                </>
              )}
              {weakest && (
                <>
                  <span className="text-slate-300">|</span>
                  <span className="truncate text-rose-600" title={weakest.subject}>
                    ↓ {weakest.subject}
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {!overview ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-white text-center">
          <CalendarDays className="h-7 w-7 text-slate-300" />
          <p className="text-base text-slate-600">No exams match these filters</p>
          <button type="button" onClick={clearFilters} className="text-sm font-semibold text-blue-600">
            Clear filters
          </button>
        </div>
      ) : (
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2.5">
            <BookOpen className="h-5 w-5 text-violet-600" />
            <span className="text-sm font-bold text-slate-800">Subjects</span>
            <span className="text-xs text-slate-400">
              ({filteredSubjects.length})
            </span>
            <div className="ml-auto flex w-full items-center gap-2 sm:w-auto">
              <div className="relative min-w-0 flex-1 sm:w-52 sm:flex-none">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search"
                  className="h-9 w-full rounded-md border border-slate-200 pl-8 pr-2 text-sm outline-none focus:border-violet-300"
                />
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'top' | 'low' | 'name')}
                className="h-9 shrink-0 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-600"
              >
                <option value="top">Top</option>
                <option value="low">Low</option>
                <option value="name">A–Z</option>
              </select>
            </div>
          </header>

          {/* Only this area scrolls */}
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain scroll-touch divide-y divide-slate-100 [scrollbar-width:thin]">
            {filteredSubjects.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-slate-400">No subjects match.</p>
            ) : (
              filteredSubjects.map((s) => (
                <SubjectCard
                  key={s.subject}
                  subject={s}
                  open={openSubject === s.subject}
                  onToggle={() =>
                    setOpenSubject((cur) => (cur === s.subject ? null : s.subject))
                  }
                />
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const active = value !== 'all';
  return (
    <label className="flex min-w-0 flex-1 basis-[7rem] items-center gap-1.5 sm:flex-none sm:basis-auto">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'h-9 w-full rounded-lg border px-2.5 text-sm font-medium outline-none transition-colors focus:border-violet-300 sm:w-auto sm:min-w-[8.5rem] sm:max-w-[16rem]',
          active
            ? 'border-violet-300 bg-violet-50 text-violet-800'
            : 'border-slate-200 bg-white text-slate-600'
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.value === 'all' ? o.label : `${label}: ${o.label}`}
          </option>
        ))}
      </select>
    </label>
  );
}

function SubjectCard({
  subject,
  open,
  onToggle,
}: {
  subject: SubjectAnalysis;
  open: boolean;
  onToggle: () => void;
}) {
  const style = LETTER_STYLES[subject.grade] ?? LETTER_STYLES.W;

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-slate-50"
      >
        <span
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm font-extrabold',
            style.bg,
            style.text
          )}
        >
          {subject.grade}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-slate-900" title={subject.subject}>
              {subject.subject}
            </p>
            <TrendPill trend={subject.trend} />
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn('h-full rounded-full', pctBar(subject.average))}
              style={{ width: `${Math.min(100, subject.average)}%` }}
            />
          </div>
        </div>
        <span className={cn('shrink-0 text-base font-bold', pctColor(subject.average))}>
          {subject.average.toFixed(0)}%
        </span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-slate-400', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="border-t border-slate-100 bg-slate-50/80 px-3 py-2.5">
          <div className="space-y-1.5">
            {[...subject.points].reverse().map((p) => {
              const ps = LETTER_STYLES[p.grade] ?? LETTER_STYLES.W;
              return (
                <div
                  key={p.examId}
                  className="flex items-center gap-2 rounded-md border border-slate-200/60 bg-white px-2.5 py-1.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-700">{p.examName}</p>
                    <p className="text-xs text-slate-400">
                      {p.term} · {p.year}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500">
                    {p.obtained}/{p.max}
                  </span>
                  <span className={cn('rounded px-1.5 py-0.5 text-xs font-bold', ps.bg, ps.text)}>
                    {p.grade}
                  </span>
                  <span className={cn('w-11 text-right text-sm font-bold', pctColor(p.percentage))}>
                    {p.percentage.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TrendPill({ trend }: { trend: number | null }) {
  if (trend == null) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">
        <Minus className="h-3 w-3" /> New
      </span>
    );
  }
  const up = trend > 0.05;
  const down = trend < -0.05;
  if (!up && !down) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">
        <Minus className="h-3 w-3" /> Steady
      </span>
    );
  }
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold',
        up ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
      )}
    >
      <Icon className="h-3 w-3" />
      {up ? '+' : ''}
      {trend.toFixed(1)}%
    </span>
  );
}

function CircularGauge({
  value,
  grade,
  size = 'md',
}: {
  value: number;
  grade: string;
  size?: 'sm' | 'md';
}) {
  const radius = size === 'sm' ? 30 : 34;
  const box = size === 'sm' ? 68 : 88;
  const strokeW = size === 'sm' ? 7 : 8;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;
  const stroke =
    value >= 75
      ? '#10b981'
      : value >= 65
        ? '#3b82f6'
        : value >= 50
          ? '#f59e0b'
          : value >= 35
            ? '#f97316'
            : '#f43f5e';
  const normalizedGrade = grade.trim().toUpperCase() === 'W' ? 'F' : grade.trim().toUpperCase();
  const style = LETTER_STYLES[normalizedGrade] ?? LETTER_STYLES.F;
  const cx = box / 2;

  return (
    <div className="relative shrink-0" style={{ width: box, height: box }}>
      <svg className="h-full w-full -rotate-90" viewBox={`0 0 ${box} ${box}`}>
        <circle
          cx={cx}
          cy={cx}
          r={radius}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth={strokeW}
        />
        <motion.circle
          cx={cx}
          cy={cx}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeW}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('font-extrabold leading-none', size === 'sm' ? 'text-base' : 'text-lg', style.text)}>
          {grade}
        </span>
      </div>
    </div>
  );
}
