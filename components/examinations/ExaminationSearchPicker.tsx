'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { Examination } from '@/types';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { formatClassSection } from '@/lib/grade-class-options';

function formatExamLabel(exam: Examination): string {
  return `${exam.examName} · ${exam.grade}${exam.section ? ` · ${formatClassSection(exam.grade, exam.section)}` : ''}`;
}

function formatExamMeta(exam: Examination): string {
  return `${exam.year} · ${exam.term}`;
}

function matchesExamSearch(exam: Examination, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    exam.examName,
    exam.grade,
    exam.term,
    String(exam.year),
    exam.section ?? '',
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

interface ExaminationSearchPickerProps {
  exams: Examination[];
  value: string;
  onValueChange: (examId: string) => void;
  disabled?: boolean;
  /** Dark hero banner styling */
  variant?: 'hero' | 'default';
  className?: string;
}

export function ExaminationSearchPicker({
  exams,
  value,
  onValueChange,
  disabled,
  variant = 'default',
  className,
}: ExaminationSearchPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = exams.find((e) => e.id === value) ?? null;

  const filtered = useMemo(
    () => exams.filter((exam) => matchesExamSearch(exam, query)),
    [exams, query],
  );

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }
    const id = window.requestAnimationFrame(() => searchRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  const isHero = variant === 'hero';

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled || !exams.length}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'flex h-11 w-full items-center justify-between gap-2 rounded-lg border px-3 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50',
          isHero
            ? 'border-white/20 bg-violet-800 text-white hover:bg-violet-700'
            : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50',
        )}
      >
        <span className={cn('min-w-0 truncate', !selected && 'opacity-70')}>
          {selected ? formatExamLabel(selected) : 'Select examination'}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 transition-transform',
            isHero ? 'text-white/70' : 'text-slate-400',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.375rem)] z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl ring-1 ring-black/5"
        >
          <div className="border-b border-slate-100 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, grade, term, year…"
                className="h-9 border-slate-200 bg-slate-50 pl-8 text-sm focus-visible:ring-violet-500/30"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setOpen(false);
                  }
                }}
              />
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto overscroll-contain p-1 [scrollbar-width:thin]">
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-slate-500">No examinations match.</p>
            ) : (
              filtered.map((exam) => {
                const isSelected = exam.id === value;
                return (
                  <button
                    key={exam.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onValueChange(exam.id);
                      setOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                      isSelected
                        ? 'bg-violet-50 text-violet-900'
                        : 'text-slate-800 hover:bg-slate-50',
                    )}
                  >
                    <Check
                      className={cn(
                        'mt-0.5 h-4 w-4 shrink-0',
                        isSelected ? 'text-violet-600 opacity-100' : 'opacity-0',
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{formatExamLabel(exam)}</span>
                      <span className="block text-xs text-slate-500">{formatExamMeta(exam)}</span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
