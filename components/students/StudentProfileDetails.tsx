'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Pencil,
  Printer,
  BarChart3,
  ArrowLeft,
  Phone,
  Mail,
  MessageCircle,
  MapPin,
  CalendarDays,
  User as UserIcon,
  IdCard,
  Heart,
  GraduationCap,
  School,
  Languages,
  Music,
  Users,
  Briefcase,
  Accessibility,
  TrendingUp,
  ClipboardList,
  Hash,
  Flag,
  Droplet,
  StickyNote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Student, ExamResult } from '@/types';
import { formatDate, calculateAge } from '@/lib/utils';
import { STUDENT_FIELD_LABELS as L } from '@/lib/student-form-fields';
import { formatClassSection, getClassFieldLabel, isAdvancedLevelGrade } from '@/lib/grade-class-options';
import { StudentProfilePhoto } from '@/components/students/StudentProfilePhoto';
import { ProfileImageEnlarge } from '@/components/ProfileImageEnlarge';
import { ContactActionLink, type ContactLinkKind } from '@/components/contact/ContactActionLink';
import { formatIdentityNumber } from '@/lib/identity-numbers';
import { cn } from '@/lib/utils';
import { StatIconBadge } from '@/components/ui/StatIconBadge';

type StatusVariant = 'success' | 'secondary' | 'default' | 'warning';

const statusVariants: Record<Student['status'], StatusVariant> = {
  active: 'success',
  inactive: 'secondary',
  graduated: 'default',
  transferred: 'warning',
};

function display(value: string | null | undefined): string {
  if (value === undefined || value === null) return '—';
  const v = String(value).trim();
  return v === '' ? '—' : v;
}

function yearsSince(dateStr?: string): number {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 0;
  const diff = Date.now() - d.getTime();
  return Math.max(0, Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000)));
}

type FieldItem = {
  label: string;
  value: string;
  icon: React.ElementType;
  span?: 1 | 2;
  contactLink?: ContactLinkKind;
};

function InfoRow({ item }: { item: FieldItem }) {
  const { label, value, icon: Icon, span = 1, contactLink } = item;
  const isEmpty = value === '—';
  return (
    <div
      className={cn(
        'group flex items-start gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-50',
        span === 2 && 'sm:col-span-2'
      )}
    >
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700 ring-1 ring-blue-100/70">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <div
          className={cn(
            'mt-0.5 break-words text-[13px] font-medium leading-snug',
            isEmpty ? 'text-slate-400 italic' : 'text-slate-900'
          )}
          title={isEmpty ? undefined : value}
        >
          {!isEmpty && contactLink ? (
            <ContactActionLink kind={contactLink} value={value} />
          ) : (
            value
          )}
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  accent,
  children,
  index,
  className,
}: {
  title: string;
  icon: React.ElementType;
  accent: 'blue' | 'amber' | 'emerald' | 'violet' | 'rose' | 'sky';
  children: React.ReactNode;
  index: number;
  className?: string;
}) {
  return (
    <motion.section
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3, ease: 'easeOut' }}
      className={cn(
        'flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-black/[0.02]',
        className
      )}
    >
      <header className="relative flex shrink-0 items-center gap-2.5 border-b border-slate-100 px-3.5 py-2.5">
        <StatIconBadge icon={Icon} tone={accent} size="xs" />
        <h3 className="text-[13px] font-bold tracking-tight text-slate-900">{title}</h3>
      </header>
      <div className="px-2 py-2 sm:px-3">
        <div className="grid grid-cols-1 gap-y-0.5 sm:grid-cols-2">{children}</div>
      </div>
    </motion.section>
  );
}

interface StudentProfileDetailsProps {
  student: Student;
  results: ExamResult[];
  studentId: string;
  canManage: boolean;
  canViewExamAnalysis?: boolean;
  onExport: () => void;
  backHref: string;
}

export function StudentProfileDetails({
  student,
  results,
  studentId,
  canManage,
  canViewExamAnalysis = false,
  onExport,
  backHref,
}: StudentProfileDetailsProps) {
  const genderLabel = student.gender.charAt(0).toUpperCase() + student.gender.slice(1);
  const age = calculateAge(student.dateOfBirth);
  const yearsAtSchool = yearsSince(student.admissionDate);

  const averageScore = useMemo(
    () => (results.length === 0 ? 0 : results.reduce((s, r) => s + r.percentage, 0) / results.length),
    [results]
  );

  const personalFields: FieldItem[] = [
    { label: L.nameWithInitials, value: display(student.nameWithInitials), icon: UserIcon },
    { label: L.dateOfBirth, value: `${formatDate(student.dateOfBirth)} · ${age}y`, icon: CalendarDays },
    { label: L.gender, value: genderLabel, icon: UserIcon },
    { label: L.nic, value: formatIdentityNumber(student.nic), icon: IdCard },
    { label: L.religion, value: display(student.religion), icon: Heart },
    { label: 'Nationality', value: display(student.nationality), icon: Flag },
    { label: 'Blood group', value: display(student.bloodGroup), icon: Droplet },
    { label: L.formSubmittedAt, value: display(student.formSubmittedAt), icon: ClipboardList },
  ];

  const contactFields: FieldItem[] = [
    { label: L.phone, value: display(student.phone), icon: Phone, contactLink: 'tel' },
    { label: L.whatsapp, value: display(student.whatsapp), icon: MessageCircle, contactLink: 'whatsapp' },
    { label: L.email, value: display(student.email), icon: Mail, span: 2, contactLink: 'mailto' },
    { label: L.address, value: display(student.address), icon: MapPin, span: 2 },
  ];

  const academicFields: FieldItem[] = [
    { label: L.grade, value: student.grade, icon: GraduationCap },
    {
      label: getClassFieldLabel(student.grade),
      value: student.section ? formatClassSection(student.grade, student.section) : display(student.section),
      icon: Hash,
    },
    { label: L.admissionDate, value: formatDate(student.admissionDate), icon: CalendarDays },
    { label: 'Years at school', value: `${yearsAtSchool}y`, icon: TrendingUp },
    { label: L.mediumOfStudy, value: display(student.mediumOfStudy), icon: Languages },
    {
      label: isAdvancedLevelGrade(student.grade) ? L.alSubjects : L.aestheticsSubject,
      value: display(student.aestheticsSubject),
      icon: Music,
    },
    { label: L.previousSchools, value: display(student.previousSchools), icon: School, span: 2 },
  ];

  const parentFields: FieldItem[] = [
    { label: L.parentName, value: display(student.parentName), icon: UserIcon },
    { label: L.parentOccupation, value: display(student.parentOccupation), icon: Briefcase },
    { label: L.parentPhone, value: display(student.parentPhone), icon: Phone, contactLink: 'tel' },
    { label: L.parentNic, value: formatIdentityNumber(student.parentNic), icon: IdCard },
    { label: 'Parent email', value: display(student.parentEmail), icon: Mail, span: 2, contactLink: 'mailto' },
  ];

  const familyFields: FieldItem[] = [
    { label: L.siblings, value: display(student.siblings), icon: Users, span: 2 },
    { label: L.siblingGrades, value: display(student.siblingGrades), icon: GraduationCap, span: 2 },
    { label: L.specialDisabilities, value: display(student.specialDisabilities), icon: Accessibility },
    { label: 'Notes', value: display(student.notes), icon: StickyNote },
  ];

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      {/* Action bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" size="sm" asChild className="-ml-2 min-h-[44px] px-2 text-slate-500 hover:text-slate-900 sm:min-h-9">
          <Link href={backHref}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          {canViewExamAnalysis && (
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] flex-1 border-violet-200 text-violet-800 hover:bg-violet-50 sm:min-h-9 sm:flex-none"
              asChild
            >
              <Link href={`/dashboard/students/${studentId}/exam-performance`}>
                <BarChart3 className="mr-1.5 h-4 w-4" />
                <span className="sm:hidden">Exam analysis</span>
                <span className="hidden sm:inline">Exam Performance Analysis</span>
              </Link>
            </Button>
          )}
          <Button variant="outline" size="sm" className="min-h-[44px] flex-1 sm:min-h-9 sm:flex-none" onClick={onExport}>
            <Printer className="mr-1.5 h-4 w-4" /> Export PDF
          </Button>
          {canManage && (
            <Button size="sm" className="min-h-[44px] flex-1 bg-blue-700 text-white hover:bg-blue-800 sm:min-h-9 sm:flex-none" asChild>
              <Link href={`/dashboard/students/${studentId}/edit`}>
                <Pencil className="mr-1.5 h-4 w-4" /> Edit
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Identity hero */}
      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="surface-blue relative shrink-0 overflow-hidden rounded-2xl border border-slate-200/80 px-3 py-3 shadow-lg shadow-blue-900/15 sm:px-4"
      >
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-amber-400/20 blur-3xl" aria-hidden />
        <div className="absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-blue-400/10 blur-3xl" aria-hidden />

        <div className="relative flex flex-wrap items-center gap-4">
          <div className="shrink-0 rounded-2xl bg-brand-800 p-1 ring-2 ring-white/20">
            <ProfileImageEnlarge
              name={student.name}
              profileImageUrl={student.profileImageUrl}
              className="rounded-xl focus-visible:ring-white/60 focus-visible:ring-offset-brand-800"
            >
              <StudentProfilePhoto
                name={student.name}
                profileImageUrl={student.profileImageUrl}
                size="md"
                className="h-16 w-16 rounded-xl sm:h-20 sm:w-20"
              />
            </ProfileImageEnlarge>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-lg font-bold leading-tight sm:text-xl">{student.name}</h1>
              <Badge
                variant={statusVariants[student.status]}
                className="capitalize shadow-sm ring-1 ring-white/30"
              >
                {student.status}
              </Badge>
            </div>
            <p className="mt-0.5 text-[12px] font-medium text-blue-100">{display(student.nameWithInitials)}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-blue-100">
              <span className="inline-flex items-center gap-1 font-mono font-semibold text-amber-300">
                <Hash className="h-3 w-3" />
                {student.admissionNumber}
              </span>
              <span className="opacity-50">·</span>
              <span className="inline-flex items-center gap-1">
                <GraduationCap className="h-3 w-3" />
                Grade {student.grade}
                {student.section ? ` · ${formatClassSection(student.grade, student.section)}` : ''}
              </span>
              {student.mediumOfStudy && (
                <>
                  <span className="opacity-50">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Languages className="h-3 w-3" />
                    {student.mediumOfStudy}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Quick stats — desktop */}
          <div className="hidden shrink-0 items-stretch divide-x divide-white/15 rounded-xl bg-white/5 ring-1 ring-white/10 lg:flex">
            <Stat label="Age" value={`${age}`} suffix="yrs" />
            <Stat label="At school" value={`${yearsAtSchool}`} suffix="yrs" />
            <Stat label="Exams" value={`${results.length}`} />
            <Stat
              label="Avg score"
              value={results.length ? averageScore.toFixed(0) : '—'}
              suffix={results.length ? '%' : undefined}
              highlight
            />
          </div>
        </div>

        {/* Quick stats — mobile & tablet */}
        <div className="relative mt-3 flex gap-2 overflow-x-auto scroll-touch pb-1 lg:hidden">
          <MobileStatChip label="Age" value={`${age} yrs`} />
          <MobileStatChip label="At school" value={`${yearsAtSchool} yrs`} />
          <MobileStatChip label="Exams" value={String(results.length)} />
          <MobileStatChip
            label="Avg"
            value={results.length ? `${averageScore.toFixed(0)}%` : '—'}
            highlight
          />
        </div>
      </motion.div>

      {/* Content grid */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SectionCard title="Personal" icon={UserIcon} accent="blue" index={0}>
          {personalFields.map((f) => (
            <InfoRow key={f.label} item={f} />
          ))}
        </SectionCard>

        <SectionCard title="Contact" icon={Phone} accent="sky" index={1}>
          {contactFields.map((f) => (
            <InfoRow key={f.label} item={f} />
          ))}
        </SectionCard>

        <SectionCard title="Academic" icon={GraduationCap} accent="violet" index={2}>
          {academicFields.map((f) => (
            <InfoRow key={f.label} item={f} />
          ))}
        </SectionCard>

        <SectionCard title="Parent / guardian" icon={Users} accent="emerald" index={3}>
          {parentFields.map((f) => (
            <InfoRow key={f.label} item={f} />
          ))}
        </SectionCard>

        <SectionCard title="Family & health" icon={Heart} accent="rose" index={4}>
          {familyFields.map((f) => (
            <InfoRow key={f.label} item={f} />
          ))}
        </SectionCard>
      </div>
    </div>
  );
}

function MobileStatChip({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'shrink-0 rounded-lg px-3 py-2 ring-1 ring-white/15',
        highlight ? 'bg-amber-400/20' : 'bg-white/10'
      )}
    >
      <p className="text-[9px] font-bold uppercase tracking-wider text-blue-200/90">{label}</p>
      <p className={cn('text-sm font-extrabold', highlight ? 'text-amber-300' : 'text-white')}>{value}</p>
    </div>
  );
}

function Stat({
  label,
  value,
  suffix,
  highlight,
}: {
  label: string;
  value: string;
  suffix?: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-3.5 py-1.5 min-w-[68px]">
      <p className="text-[9.5px] font-bold uppercase tracking-wider text-blue-200/80">{label}</p>
      <p
        className={cn(
          'mt-0.5 text-base font-extrabold leading-tight',
          highlight ? 'text-amber-300' : 'text-white'
        )}
      >
        {value}
        {suffix && <span className="ml-0.5 text-[10px] font-bold opacity-70">{suffix}</span>}
      </p>
    </div>
  );
}

