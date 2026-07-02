'use client';

import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { isAdvancedLevelGrade } from '@/lib/grade-class-options';
import { EXAM_GRADING_SCALE } from '@/lib/exam-grading';
import {
  AL_SUBJECT_COUNT,
  countCurriculumSubjects,
  EXAM_CURRICULA,
  getCurriculumForGrade,
  getSubjectsForDisplay,
  getSubjectsForExamination,
  type ExamCurriculum,
  type ExamGradeBand,
  type ExamSubjectGroup,
} from '@/lib/exam-subjects';

function SelectOneDropdownPreview({ group }: { group: ExamSubjectGroup }) {
  return (
    <div className="mt-2 max-w-xs">
      <label className="mb-1 block text-[11px] font-medium text-slate-600">{group.title}</label>
      <Select disabled>
        <SelectTrigger className="h-9 bg-white text-sm">
          <SelectValue placeholder={group.title} />
        </SelectTrigger>
        <SelectContent>
          {group.subjects.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="mt-1.5 text-[11px] text-slate-500">
        Open dropdown to choose: {group.subjects.join(', ')}
      </p>
    </div>
  );
}

function SubjectGroupBlock({ group }: { group: ExamSubjectGroup }) {
  if (group.pending) {
    return (
      <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50/60 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-sm font-semibold text-amber-900">{group.title}</p>
          <Badge variant="outline" className="border-amber-300 text-[10px] text-amber-700">
            Pending
          </Badge>
        </div>
        <p className="mt-1 text-xs text-amber-700/80">Curriculum details will be added later.</p>
      </div>
    );
  }

  if (group.selectOne) {
    return (
      <div className="rounded-lg border border-slate-200/80 bg-slate-50/50 px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-slate-800">{group.title}</p>
          <Badge variant="secondary" className="text-[10px]">
            Dropdown
          </Badge>
        </div>
        <SelectOneDropdownPreview group={group} />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200/80 bg-slate-50/50 px-3 py-2.5">
      <p className="text-sm font-semibold text-slate-800">{group.title}</p>
      {group.description && (
        <p className="mt-0.5 text-[11px] text-slate-500">{group.description}</p>
      )}
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {group.subjects.map((subject, idx) => (
          <li key={subject}>
            <span className="inline-flex items-center rounded-md bg-white px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200/80">
              <span className="mr-1.5 text-[10px] font-bold text-purple-500">{idx + 1}.</span>
              {subject}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CurriculumBandPanel({ curriculum }: { curriculum: ExamCurriculum }) {
  const isAL = curriculum.band === 'grades_12_13';
  const totalSubjects = isAL
    ? AL_SUBJECT_COUNT
    : countCurriculumSubjects(curriculum.grades[0]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs text-slate-500">
          Applies to:{' '}
          <span className="font-semibold text-slate-700">{curriculum.grades.join(', ')}</span>
        </p>
        {totalSubjects > 0 && (
          <Badge variant="outline" className="text-[10px]">
            {isAL || curriculum.groups.some((g) => g.selectOne)
              ? `${totalSubjects} subjects per student`
              : `${totalSubjects} subjects`}
          </Badge>
        )}
      </div>
      <div className="space-y-2">
        {curriculum.groups.map((group) => (
          <SubjectGroupBlock key={group.title} group={group} />
        ))}
      </div>
    </div>
  );
}

interface ExamCurriculumPanelProps {
  defaultBand?: ExamGradeBand;
  compact?: boolean;
}

export function ExamCurriculumPanel({ defaultBand = 'grades_6_9', compact = false }: ExamCurriculumPanelProps) {
  const [activeBand, setActiveBand] = useState<ExamGradeBand>(defaultBand);
  const [expanded, setExpanded] = useState(!compact);
  const active = EXAM_CURRICULA.find((c) => c.band === activeBand)!;

  return (
    <div className="rounded-2xl border border-purple-200/60 bg-purple-50 shadow-sm ring-1 ring-black/[0.02]">
      <button
        type="button"
        onClick={() => compact && setExpanded((v) => !v)}
        className={cn(
          'flex w-full items-center justify-between gap-3 px-4 py-3 text-left',
          compact && 'cursor-pointer hover:bg-purple-50/50'
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-100">
            <BookOpen className="h-4 w-4 text-purple-600" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 sm:text-base">Examination Curriculum</h2>
            <p className="text-[11px] text-slate-500 sm:text-xs">
              Delta Gemunupura College — subjects by grade band
            </p>
          </div>
        </div>
        {compact &&
          (expanded ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
          ))}
      </button>

      {expanded && (
        <div className="border-t border-purple-100/80 px-4 pb-4 pt-3">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {EXAM_CURRICULA.map((c) => (
              <button
                key={c.band}
                type="button"
                onClick={() => setActiveBand(c.band)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                  activeBand === c.band
                    ? 'bg-purple-700 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
          <CurriculumBandPanel curriculum={active} />
          <div className="mt-4 rounded-lg border border-slate-200/80 bg-slate-50/50 px-3 py-2.5">
            <p className="text-sm font-semibold text-slate-800">Grading scale</p>
            <ul className="mt-2 space-y-1">
              {EXAM_GRADING_SCALE.map((band) => (
                <li key={band.grade} className="text-[11px] text-slate-600">
                  <span className="font-bold text-slate-800">{band.grade}</span> ({band.label}):{' '}
                  {band.min}% – {band.max}%
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

interface ExamSubjectPreviewProps {
  grade: string;
  section?: string;
  className?: string;
}

export function ExamSubjectPreview({ grade, section, className }: ExamSubjectPreviewProps) {
  const curriculum = getCurriculumForGrade(grade);
  const isAL = isAdvancedLevelGrade(grade);
  const streamSubjects = isAL ? getSubjectsForExamination(grade, section) : [];
  const subjects = isAL ? streamSubjects : getSubjectsForDisplay(grade);
  const subjectCount = countCurriculumSubjects(grade, section);

  if (!curriculum) return null;

  if (isAL && !section) {
    return (
      <div className={cn('rounded-xl border border-purple-100 bg-purple-50/40 p-3', className)}>
        <p className="text-xs font-bold uppercase tracking-wide text-purple-700">
          Subjects for {grade}
        </p>
        <p className="mt-1 text-[11px] text-slate-500">Select a stream to see the subject pool.</p>
      </div>
    );
  }

  if (subjects.length === 0) return null;

  return (
    <div className={cn('rounded-xl border border-purple-100 bg-purple-50/40 p-3', className)}>
      <p className="text-xs font-bold uppercase tracking-wide text-purple-700">
        Subjects for {grade}
        {isAL && section ? ` · ${section}` : ''}
      </p>
      <p className="mt-0.5 text-[11px] text-slate-500">
        {curriculum.label} · {subjectCount} subjects per student
        {isAL ? ' (pick from stream pool below)' : ''}
      </p>
      <div className="mt-2 flex flex-wrap gap-1">
        {subjects.map((s) => (
          <Badge key={s} variant="secondary" className="text-[10px] font-normal">
            {s}
          </Badge>
        ))}
      </div>
      {!isAL &&
        curriculum.groups
          .filter((g) => g.selectOne && !g.pending)
          .map((g) => (
            <p key={g.title} className="mt-2 text-[11px] text-slate-500">
              * {g.subjects.join(', ')} are chosen inside the {g.title} dropdown.
            </p>
          ))}
    </div>
  );
}
