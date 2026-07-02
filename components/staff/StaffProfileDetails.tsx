'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Pencil,
  Printer,
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  CalendarDays,
  User as UserIcon,
  IdCard,
  Briefcase,
  BookOpen,
  GraduationCap,
  Building2,
  Hash,
  StickyNote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Staff } from '@/types';
import { STAFF_FIELD_LABELS as L } from '@/lib/staff-form-fields';
import { formatDate, calculateAge } from '@/lib/utils';
import { StaffAvatar } from '@/components/staff/StaffAvatar';
import { ProfileImageEnlarge } from '@/components/ProfileImageEnlarge';
import { ContactActionLink, type ContactLinkKind } from '@/components/contact/ContactActionLink';
import { cn } from '@/lib/utils';
import { StatIconBadge } from '@/components/ui/StatIconBadge';
import { isSchoolLeadership, staffTypeBadgeLabel, staffTypeDisplayLabel } from '@/lib/staff-display';

type StatusVariant = 'success' | 'secondary' | 'warning';

const statusVariants: Record<Staff['status'], StatusVariant> = {
  active: 'success',
  inactive: 'secondary',
  retired: 'warning',
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
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100/70">
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
  accent: 'emerald' | 'blue' | 'violet' | 'amber';
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
        'flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-black/[0.02]',
        className
      )}
    >
      <header className="flex shrink-0 items-center gap-2.5 border-b border-slate-100 px-3.5 py-2.5">
        <StatIconBadge icon={Icon} tone={accent} size="xs" />
        <h3 className="text-[13px] font-bold tracking-tight text-slate-900">{title}</h3>
      </header>
      <div className="px-2 py-2 sm:px-3">
        <div className="grid grid-cols-1 gap-y-0.5 sm:grid-cols-2">{children}</div>
      </div>
    </motion.section>
  );
}

interface StaffProfileDetailsProps {
  staff: Staff;
  staffId: string;
  canManage: boolean;
  /** Teachers — contact fields only (no NIC, employment history, etc.). */
  limitedView?: boolean;
  onExport: () => void;
  backHref: string;
}

export function StaffProfileDetails({
  staff,
  staffId,
  canManage,
  limitedView = false,
  onExport,
  backHref,
}: StaffProfileDetailsProps) {
  const genderLabel = staff.gender.charAt(0).toUpperCase() + staff.gender.slice(1);
  const age = calculateAge(staff.dateOfBirth);
  const yearsEmployed = yearsSince(staff.joinedDate);
  const subjectCount = staff.subjects?.length ?? 0;
  const leadership = isSchoolLeadership(staff);

  const personalFields: FieldItem[] = [
    { label: L.name, value: staff.name, icon: UserIcon },
    { label: L.nameWithInitials, value: display(staff.nameWithInitials), icon: UserIcon },
    { label: L.nic, value: display(staff.nic), icon: IdCard },
    { label: L.registrationNumber, value: display(staff.registrationNumber), icon: Hash },
    { label: L.classAndGrade, value: display(staff.classAndGrade), icon: GraduationCap },
    {
      label: L.dateOfBirth,
      value: `${formatDate(staff.dateOfBirth)} · ${age}y`,
      icon: CalendarDays,
    },
    { label: L.gender, value: genderLabel, icon: UserIcon },
    { label: L.maritalStatus, value: display(staff.maritalStatus), icon: UserIcon },
    { label: L.address, value: display(staff.address), icon: MapPin, span: 2 },
    { label: L.phone, value: display(staff.phone), icon: Phone, contactLink: 'tel' },
    { label: L.whatsapp, value: display(staff.whatsapp), icon: Phone, contactLink: 'whatsapp' },
    { label: L.email, value: display(staff.email), icon: Mail, contactLink: 'mailto' },
  ];

  const employmentFields: FieldItem[] = [
    { label: L.staffId, value: staff.staffId, icon: Hash },
    { label: L.teacherNumber, value: display(staff.teacherNumber), icon: Hash },
    { label: L.designation, value: display(staff.designation), icon: Briefcase },
    { label: L.staffClassification, value: display(staff.staffClassification), icon: Briefcase },
    {
      label: L.staffType,
      value: staffTypeDisplayLabel(staff),
      icon: GraduationCap,
    },
    { label: L.department, value: display(staff.department), icon: Building2 },
    { label: L.educationalQualifications, value: display(staff.educationalQualifications), icon: BookOpen },
    { label: L.professionalQualifications, value: display(staff.professionalQualifications), icon: BookOpen },
    { label: L.appointedSubject, value: display(staff.appointedSubject), icon: BookOpen },
    { label: L.subjectsTaught, value: display(staff.subjectsTaught), icon: BookOpen },
    { label: L.gradesTaught, value: display(staff.gradesTaught), icon: GraduationCap },
    {
      label: L.firstAppointmentDate,
      value: staff.firstAppointmentDate ? formatDate(staff.firstAppointmentDate) : '—',
      icon: CalendarDays,
    },
    { label: L.joinedDate, value: formatDate(staff.joinedDate), icon: CalendarDays },
    { label: L.previousSchools, value: display(staff.previousSchools), icon: Building2, span: 2 },
    {
      label: L.status,
      value: staff.status.charAt(0).toUpperCase() + staff.status.slice(1),
      icon: UserIcon,
    },
    { label: L.notes, value: display(staff.notes), icon: StickyNote, span: 2 },
  ];

  const spouseFields: FieldItem[] = [
    { label: L.spouseName, value: display(staff.spouseName), icon: UserIcon },
    { label: L.spousePhone, value: display(staff.spousePhone), icon: Phone, contactLink: 'tel' },
    { label: L.spouseAddress, value: display(staff.spouseAddress), icon: MapPin, span: 2 },
  ];

  const emergencyFields: FieldItem[] = [
    { label: L.emergencyContactName, value: display(staff.emergencyContactName), icon: UserIcon },
    { label: L.emergencyContactPhone, value: display(staff.emergencyContactPhone), icon: Phone, contactLink: 'tel' },
  ];

  const hasSpouse = spouseFields.some((f) => f.value !== '—');
  const hasEmergency = emergencyFields.some((f) => f.value !== '—');

  const teacherContactFields: FieldItem[] = [
    { label: L.name, value: staff.name, icon: UserIcon },
    { label: L.nameWithInitials, value: display(staff.nameWithInitials), icon: UserIcon },
    { label: L.classAndGrade, value: display(staff.classAndGrade), icon: GraduationCap },
    { label: L.phone, value: display(staff.phone), icon: Phone, contactLink: 'tel' },
    { label: L.whatsapp, value: display(staff.whatsapp), icon: Phone, contactLink: 'whatsapp' },
    { label: L.email, value: display(staff.email), icon: Mail, contactLink: 'mailto' },
  ];

  if (limitedView) {
    return (
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="-ml-2 min-h-[44px] px-2 text-slate-500 hover:text-slate-900 sm:min-h-9"
          >
            <Link href={backHref}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="min-h-[44px] flex-1 sm:min-h-9 sm:flex-none"
            onClick={onExport}
          >
            <Printer className="mr-1.5 h-4 w-4" /> Export PDF
          </Button>
        </div>

        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          className="surface-emerald relative shrink-0 overflow-hidden rounded-2xl border border-slate-200/80 px-4 py-4 shadow-lg"
        >
          <div className="flex items-center gap-4">
            <ProfileImageEnlarge
              name={staff.name}
              profileImageUrl={staff.profileImageUrl}
              className="rounded-xl focus-visible:ring-white/60 focus-visible:ring-offset-emerald-900"
            >
              <StaffAvatar name={staff.name} profileImageUrl={staff.profileImageUrl} size="lg" />
            </ProfileImageEnlarge>
            <div className="min-w-0">
              <h1 className="text-lg font-bold leading-tight sm:text-xl">{staff.name}</h1>
              {staff.nameWithInitials?.trim() && (
                <p className="mt-0.5 text-sm text-emerald-100">{staff.nameWithInitials}</p>
              )}
              {staff.classAndGrade?.trim() && (
                <p className="mt-1 text-xs font-medium text-emerald-200/90">{staff.classAndGrade}</p>
              )}
            </div>
          </div>
        </motion.div>

        <SectionCard title="Staff contact" icon={UserIcon} accent="emerald" index={0} className="md:col-span-2">
          {teacherContactFields.map((f) => (
            <InfoRow key={f.label} item={f} />
          ))}
        </SectionCard>

        <p className="text-center text-xs text-slate-500">
          Additional employment details are available to administrators only.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="-ml-2 min-h-[44px] px-2 text-slate-500 hover:text-slate-900 sm:min-h-9"
        >
          <Link href={backHref}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="min-h-[44px] flex-1 sm:min-h-9 sm:flex-none"
            onClick={onExport}
          >
            <Printer className="mr-1.5 h-4 w-4" /> Export PDF
          </Button>
          {canManage && (
            <Button
              size="sm"
              className="min-h-[44px] flex-1 bg-emerald-700 text-white hover:bg-emerald-800 sm:min-h-9 sm:flex-none"
              asChild
            >
              <Link href={`/dashboard/staff/${staffId}/edit`}>
                <Pencil className="mr-1.5 h-4 w-4" /> Edit
              </Link>
            </Button>
          )}
        </div>
      </div>

      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="surface-emerald relative shrink-0 overflow-hidden rounded-2xl border border-slate-200/80 px-3 py-3 shadow-lg shadow-emerald-900/15 sm:px-4"
      >
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-emerald-400/20 blur-3xl" aria-hidden />
        <div className="absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-green-400/10 blur-3xl" aria-hidden />

        <div className="relative flex flex-wrap items-center gap-4">
          <div className="shrink-0 rounded-2xl bg-emerald-800 p-1 ring-2 ring-white/20">
            <ProfileImageEnlarge
              name={staff.name}
              profileImageUrl={staff.profileImageUrl}
              className="rounded-xl focus-visible:ring-white/60 focus-visible:ring-offset-emerald-800"
            >
              <StaffAvatar name={staff.name} profileImageUrl={staff.profileImageUrl} size="lg" />
            </ProfileImageEnlarge>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-lg font-bold leading-tight sm:text-xl">{staff.name}</h1>
              <Badge variant={statusVariants[staff.status]} className="capitalize shadow-sm ring-1 ring-white/30">
                {staff.status}
              </Badge>
            </div>
            <p className="mt-0.5 font-mono text-[12px] font-semibold text-emerald-200">{staff.staffId}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-emerald-100">
              <span className="font-medium text-white">{staff.designation}</span>
              <span className="opacity-50">·</span>
              <Badge
                variant={leadership ? 'default' : staff.staffType === 'academic' ? 'default' : 'secondary'}
                className="text-[10px] capitalize"
              >
                {staffTypeBadgeLabel(staff)}
              </Badge>
              {staff.department && (
                <>
                  <span className="opacity-50">·</span>
                  <span>{staff.department}</span>
                </>
              )}
            </div>
          </div>

          <div className="hidden shrink-0 items-stretch divide-x divide-white/15 rounded-xl bg-white/5 ring-1 ring-white/10 lg:flex">
            <Stat label="Age" value={`${age}`} suffix="yrs" />
            <Stat label="Employed" value={`${yearsEmployed}`} suffix="yrs" />
            <Stat
              label={leadership ? 'Portal role' : 'Subjects'}
              value={leadership ? 'Principal' : `${subjectCount}`}
            />
          </div>
        </div>

        <div className="relative mt-3 flex gap-2 overflow-x-auto scroll-touch pb-1 lg:hidden">
          <MobileStatChip label="Age" value={`${age} yrs`} />
          <MobileStatChip label="Employed" value={`${yearsEmployed} yrs`} />
          <MobileStatChip
            label={leadership ? 'Role' : 'Subjects'}
            value={leadership ? 'Principal' : String(subjectCount)}
          />
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
        <SectionCard title="Personal" icon={UserIcon} accent="emerald" index={0}>
          {personalFields.map((f) => (
            <InfoRow key={f.label} item={f} />
          ))}
        </SectionCard>

        <SectionCard
          title={leadership ? 'Administration & employment' : 'Employment'}
          icon={Briefcase}
          accent="blue"
          index={1}
        >
          {employmentFields.map((f) => (
            <InfoRow key={f.label} item={f} />
          ))}
        </SectionCard>

        {hasSpouse && (
          <SectionCard title="Spouse" icon={UserIcon} accent="amber" index={2}>
            {spouseFields.map((f) => (
              <InfoRow key={f.label} item={f} />
            ))}
          </SectionCard>
        )}

        {hasEmergency && (
          <SectionCard title="Emergency contact" icon={Phone} accent="amber" index={hasSpouse ? 3 : 2}>
            {emergencyFields.map((f) => (
              <InfoRow key={f.label} item={f} />
            ))}
          </SectionCard>
        )}

        {staff.subjects && staff.subjects.length > 0 && (
          <SectionCard
            title={`Subjects teaching (${staff.subjects.length})`}
            icon={BookOpen}
            accent="violet"
            index={4}
            className="md:col-span-2"
          >
            <div className="col-span-2 flex flex-wrap gap-2 px-1 py-2">
              {staff.subjects.map((sub) => (
                <span
                  key={sub}
                  className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-800"
                >
                  {sub}
                </span>
              ))}
            </div>
          </SectionCard>
        )}
      </div>
    </div>
  );
}

function MobileStatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="shrink-0 rounded-lg bg-white/10 px-3 py-2 ring-1 ring-white/15">
      <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-200/90">{label}</p>
      <p className="text-sm font-extrabold text-white">{value}</p>
    </div>
  );
}

function Stat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="flex min-w-[68px] flex-col items-center justify-center px-3.5 py-1.5">
      <p className="text-[9.5px] font-bold uppercase tracking-wider text-emerald-200/80">{label}</p>
      <p className="mt-0.5 text-base font-extrabold leading-tight text-white">
        {value}
        {suffix && <span className="ml-0.5 text-[10px] font-bold opacity-70">{suffix}</span>}
      </p>
    </div>
  );
}
